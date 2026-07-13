import optax
import equinox as eqx
import jax
from jax import numpy as jnp
from jaxtyping import Float, Array
from typing import Tuple, Dict
from tqdm import trange

from monocular_demos.biomechanics_mjx.monocular_trajectory import KineticsWrapper

def clear_jit_caches() -> None:
    """Limpa caches JIT antes/depois do fitting para aliviar memoria.

    Parametros:
        Nenhum.

    Saida:
        Nao retorna valor. Pede limpeza para Equinox e JAX.
    """
    eqx.clear_caches()
    jax.clear_caches()

def loss(
    model: KineticsWrapper,
    x: Float[Array, "times"],
    y: Float[Array, "times keypoints 3"],
    site_offset_regularization = 1e-1
) -> Tuple[Float, Dict]:
    """Calcula o erro entre o modelo biomecanico e os keypoints 3D.

    Parametros:
        model: Wrapper cinetico ajustavel.
        x: Timestamps dos frames.
        y: Keypoints 3D alvo.
        site_offset_regularization: Peso para evitar offsets exagerados nos sites.

    Retorna:
        Tupla com valor de loss e metricas auxiliares para monitoramento.
    """

    timestamps = x
    keypoints3d = y
    metrics = {}

    (state, constraints, next_states), (ang, vel, action), _ = model(
        timestamps,
        skip_vel=True,
        skip_action=True
    )

    if keypoints3d.shape[1] == state.site_xpos.shape[1]:
        pred_kp3d = state.site_xpos
    else:
        jax_indices = jnp.array([69, 81, 83, 79, 73, 75, 71, 68, 70, 67, 67, 76, 72, 77, 84, 80, 85])
        pred_kp3d = state.site_xpos[:, jax_indices, :]

    l = jnp.mean((pred_kp3d - keypoints3d) ** 2) * 100 
    metrics["kp_err"] = l


    l_site_offset = jnp.sum(jnp.square(model.site_offsets))
    l += l_site_offset * site_offset_regularization

    metrics = {"loss": l, **metrics}
    return l, metrics

@eqx.filter_jit
def step(model, opt_state, data, loss_grad, optimizer, **kwargs):
    """Executa uma iteracao JIT de otimizacao do fitting.

    Parametros:
        model: Modelo atual.
        opt_state: Estado interno do otimizador.
        data: Tupla `(timestamps, keypoints3d)`.
        loss_grad: Funcao que calcula loss e gradientes.
        optimizer: Otimizador Optax.
        **kwargs: Ajustes extras repassados para a loss.

    Retorna:
        Valor da loss, modelo atualizado, novo estado do otimizador e metricas.
    """
    x, targets = data
    (val, metrics), grads = loss_grad(model, x=x, y=targets, **kwargs)
    params = eqx.filter(model, eqx.is_inexact_array)
    updates, opt_state = optimizer.update(grads, opt_state, params)
    model = eqx.apply_updates(model, updates)
    return val, model, opt_state, metrics

def fit_model(
    model: KineticsWrapper, dataset: Tuple,
    lr_end_value: float = 1e-8,
    lr_init_value: float = 1e-4,
    max_iters: int = 5000,
    clip_by_global_norm: float = 0.1,
):
    """Ajusta o modelo biomecanico aos keypoints 3D detectados.

    Parametros:
        model: Wrapper inicial do modelo.
        dataset: Tupla com timestamps e keypoints normalizados.
        lr_end_value: Taxa de aprendizado final.
        lr_init_value: Taxa de aprendizado inicial.
        max_iters: Quantidade de iteracoes de otimizacao.
        clip_by_global_norm: Limite para estabilizar gradientes.

    Retorna:
        Modelo ajustado e ultimas metricas de treinamento.
    """
    clear_jit_caches()

    transition_steps = 10
    lr_decay_rate = (lr_end_value / lr_init_value) ** (1.0 / (max_iters // transition_steps))
    learning_rate = optax.warmup_exponential_decay_schedule(
        init_value=0,
        warmup_steps=0,
        peak_value=lr_init_value,
        end_value=lr_end_value,
        decay_rate=lr_decay_rate,
        transition_steps=transition_steps,
    )

    optimizer = optax.chain(
        optax.adamw(learning_rate=learning_rate, b1=0.8, weight_decay=1e-5), 
        optax.zero_nans(), 
        optax.clip_by_global_norm(clip_by_global_norm)
    )

    opt_state = optimizer.init(eqx.filter(model, eqx.is_inexact_array))

    loss_grad = eqx.filter_value_and_grad(loss, has_aux=True)

    counter = trange(max_iters)
    for i in counter:
        val, model, opt_state, metrics = step(model, opt_state, dataset, loss_grad, optimizer)

        if i > 0 and i % int(max_iters // 10) == 0:
            pass 

        if i % 50 == 0:
            metrics = {k: v.item() for k,v in metrics.items()}
            counter.set_postfix(metrics)

    clear_jit_caches()
    return model, metrics
