from __future__ import annotations

import math
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any


REPORT_FILENAME = "relatorio_analise_marcha.pdf"


def _format_datetime(value: str | None) -> str:
    """Formata timestamps ISO para exibicao humana no relatorio.

    Parametros:
        value: Timestamp em ISO-8601 vindo do `ResultV1`.

    Retorna:
        Texto formatado em `dd/mm/aaaa hh:mm`, ou `-` quando nao houver valor valido.
    """
    if not value:
        return "-"

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value

    return parsed.strftime("%d/%m/%Y %H:%M")


def _format_number(value: Any, suffix: str = "", decimals: int = 2) -> str:
    """Transforma numeros em texto curto para tabelas do PDF.

    Parametros:
        value: Valor numerico ou texto.
        suffix: Unidade a acrescentar, como `°` ou `mm`.
        decimals: Casas decimais para floats.

    Retorna:
        Texto pronto para renderizacao em tabela.
    """
    if value is None:
        return "-"

    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)

    if not math.isfinite(number):
        return "-"

    if abs(number - round(number)) < 1e-9:
        return f"{int(round(number))}{suffix}"
    return f"{number:.{decimals}f}{suffix}"


def _as_float_series(values: Any) -> list[float]:
    """Converte uma serie qualquer em lista de floats finitos.

    Parametros:
        values: Lista/tupla com valores numericos.

    Retorna:
        Lista apenas com floats validos, ignorando itens ausentes ou invalidos.
    """
    if not isinstance(values, (list, tuple)):
        return []

    series = []
    for value in values:
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number):
            series.append(number)
    return series


def _series_stats(values: list[float]) -> dict[str, float | None]:
    """Calcula estatisticas basicas de uma serie temporal.

    Parametros:
        values: Serie numerica ja sanitizada.

    Retorna:
        Dicionario com minimo, maximo, media e amplitude.
    """
    if not values:
        return {"min": None, "max": None, "mean": None, "range": None}

    minimum = min(values)
    maximum = max(values)
    mean = sum(values) / len(values)
    return {
        "min": minimum,
        "max": maximum,
        "mean": mean,
        "range": maximum - minimum,
    }


def _asymmetry_percent(right_value: float | None, left_value: float | None) -> float | None:
    """Calcula assimetria percentual entre lados direito e esquerdo.

    Parametros:
        right_value: Valor medido do lado direito.
        left_value: Valor medido do lado esquerdo.

    Retorna:
        Percentual absoluto de diferenca, ou `None` quando nao ha base numerica segura.
    """
    if right_value is None or left_value is None:
        return None

    denominator = (abs(right_value) + abs(left_value)) / 2
    if denominator <= 1e-9:
        return None

    return abs(right_value - left_value) / denominator * 100


def _metric_summary_rows(metrics: dict[str, Any]) -> list[list[str]]:
    """Monta linhas comparativas para a tabela clinica principal.

    Parametros:
        metrics: Bloco `data.metricas_clinicas` do resultado.

    Retorna:
        Linhas no formato aceito pelo ReportLab Table.
    """
    comparisons = [
        (
            "Flexao maxima do joelho",
            "joelho_direito_graus",
            "joelho_esquerdo_graus",
            " graus",
        ),
        (
            "Flexao media do joelho",
            "joelho_direito_graus",
            "joelho_esquerdo_graus",
            " graus",
            "mean",
        ),
        (
            "Amplitude do joelho",
            "joelho_direito_graus",
            "joelho_esquerdo_graus",
            " graus",
            "range",
        ),
        (
            "Flexao maxima do quadril",
            "quadril_direito_graus",
            "quadril_esquerdo_graus",
            " graus",
        ),
        (
            "Flexao media do quadril",
            "quadril_direito_graus",
            "quadril_esquerdo_graus",
            " graus",
            "mean",
        ),
        (
            "Amplitude do quadril",
            "quadril_direito_graus",
            "quadril_esquerdo_graus",
            " graus",
            "range",
        ),
    ]

    rows = [["Metrica", "Direito", "Esquerdo", "Diferenca", "Assimetria"]]
    for comparison in comparisons:
        label, right_key, left_key, unit, *stat_name = comparison
        stat = stat_name[0] if stat_name else "max"
        right_stats = _series_stats(_as_float_series(metrics.get(right_key)))
        left_stats = _series_stats(_as_float_series(metrics.get(left_key)))
        right_value = right_stats[stat]
        left_value = left_stats[stat]
        difference = (
            abs(right_value - left_value)
            if right_value is not None and left_value is not None
            else None
        )
        asymmetry = _asymmetry_percent(right_value, left_value)
        rows.append(
            [
                label,
                _format_number(right_value, unit),
                _format_number(left_value, unit),
                _format_number(difference, unit),
                _format_number(asymmetry, "%"),
            ]
        )

    ankle_stats = _series_stats(_as_float_series(metrics.get("distancia_tornozelos_mm")))
    rows.append(
        [
            "Distancia media entre tornozelos",
            _format_number(ankle_stats["mean"], " mm"),
            "-",
            "-",
            "-",
        ]
    )
    rows.append(
        [
            "Variacao da distancia entre tornozelos",
            _format_number(ankle_stats["range"], " mm"),
            "-",
            "-",
            "-",
        ]
    )

    return rows


def _build_observations(metrics: dict[str, Any], quality_info: dict[str, Any]) -> list[str]:
    """Gera observacoes automaticas conservadoras para o relatorio.

    Parametros:
        metrics: Metricas clinicas calculadas a partir da pose 3D.
        quality_info: Informacoes de qualidade do processamento.

    Retorna:
        Lista de frases curtas para orientar a leitura dos graficos.
    """
    observations = []

    for label, right_key, left_key in (
        ("joelho", "joelho_direito_graus", "joelho_esquerdo_graus"),
        ("quadril", "quadril_direito_graus", "quadril_esquerdo_graus"),
    ):
        right_max = _series_stats(_as_float_series(metrics.get(right_key)))["max"]
        left_max = _series_stats(_as_float_series(metrics.get(left_key)))["max"]
        difference = (
            abs(right_max - left_max)
            if right_max is not None and left_max is not None
            else None
        )
        if difference is not None and difference >= 5:
            higher_side = "direito" if right_max > left_max else "esquerdo"
            observations.append(
                f"O {label} {higher_side} apresentou maior pico de flexao "
                f"(diferenca aproximada de {_format_number(difference, ' graus')})."
            )

    frames_without_detection = quality_info.get("frames_without_detection") or 0
    if frames_without_detection:
        observations.append(
            "A analise teve frames sem deteccao completa de pose, portanto os graficos "
            "devem ser interpretados junto com os avisos de qualidade."
        )

    warnings = quality_info.get("warnings") or []
    if warnings:
        observations.append(
            "O video gerou avisos de qualidade; eles podem influenciar a precisao das metricas."
        )

    if not observations:
        observations.append(
            "Nao foram observadas diferencas numericas relevantes pelas regras simples deste relatorio."
        )

    observations.append(
        "Este relatorio e um apoio quantitativo para avaliacao clinica e nao substitui diagnostico profissional."
    )
    return observations


def _save_comparison_plot(
    metrics: dict[str, Any],
    right_key: str,
    left_key: str,
    title: str,
    ylabel: str,
    output_path: Path,
) -> bool:
    """Gera um grafico de linhas comparando lado direito e esquerdo.

    Parametros:
        metrics: Metricas clinicas do resultado.
        right_key: Chave da serie direita.
        left_key: Chave da serie esquerda.
        title: Titulo do grafico.
        ylabel: Rotulo do eixo Y.
        output_path: Arquivo PNG de saida.

    Retorna:
        `True` quando o grafico foi gerado; `False` quando nao havia dados suficientes.
    """
    right = _as_float_series(metrics.get(right_key))
    left = _as_float_series(metrics.get(left_key))
    if not right and not left:
        return False

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.figure(figsize=(7.2, 3.1), dpi=160)
    if right:
        plt.plot(right, color="#1f77b4", linewidth=2.0, label="Direito")
    if left:
        plt.plot(left, color="#d62728", linewidth=2.0, label="Esquerdo")
    plt.title(title, fontsize=11, pad=10)
    plt.xlabel("Frame")
    plt.ylabel(ylabel)
    plt.grid(True, alpha=0.25)
    plt.legend(loc="best")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    return True


def _save_single_plot(
    metrics: dict[str, Any],
    key: str,
    title: str,
    ylabel: str,
    output_path: Path,
) -> bool:
    """Gera um grafico de uma unica serie temporal.

    Parametros:
        metrics: Metricas clinicas do resultado.
        key: Chave da serie desejada.
        title: Titulo do grafico.
        ylabel: Rotulo do eixo Y.
        output_path: Arquivo PNG de saida.

    Retorna:
        `True` quando o grafico foi gerado; `False` se a serie nao existir.
    """
    values = _as_float_series(metrics.get(key))
    if not values:
        return False

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.figure(figsize=(7.2, 3.1), dpi=160)
    plt.plot(values, color="#2ca02c", linewidth=2.0)
    plt.title(title, fontsize=11, pad=10)
    plt.xlabel("Frame")
    plt.ylabel(ylabel)
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    return True


def _dependency_error(exc: ImportError) -> RuntimeError:
    """Cria uma mensagem clara quando dependencias de relatorio faltarem.

    Parametros:
        exc: Erro de importacao original.

    Retorna:
        `RuntimeError` com orientacao operacional.
    """
    return RuntimeError(
        "Dependencias de relatorio indisponiveis. Instale matplotlib e reportlab "
        "ou reconstrua a imagem Docker com os requirements atualizados."
    )


def generate_gait_report_pdf(result_payload: dict[str, Any], output_path: Path) -> Path:
    """Gera um PDF clinico resumido a partir de um `ResultV1`.

    Parametros:
        result_payload: Conteudo desserializado do `result.json`.
        output_path: Caminho final do PDF.

    Retorna:
        O caminho do PDF gerado.

    Saida:
        Levanta `RuntimeError` se as dependencias de PDF/grafico nao estiverem instaladas.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Image,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError as exc:
        raise _dependency_error(exc) from exc

    job = result_payload.get("job") or {}
    input_summary = result_payload.get("input_summary") or {}
    quality_info = result_payload.get("quality_info") or {}
    data = result_payload.get("data") or {}
    metrics = data.get("metricas_clinicas") or {}

    if not data:
        raise ValueError("Resultado ainda nao possui dados biomecanicos para relatorio")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "GaitTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=18,
        leading=22,
        spaceAfter=12,
        textColor=colors.HexColor("#1F2937"),
    )
    section_style = ParagraphStyle(
        "GaitSection",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor("#111827"),
    )
    body_style = ParagraphStyle(
        "GaitBody",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#374151"),
    )

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=1.4 * cm,
        leftMargin=1.4 * cm,
        topMargin=1.3 * cm,
        bottomMargin=1.3 * cm,
        title="Relatorio de Analise de Marcha",
    )
    story = [
        Paragraph("Relatorio de Analise de Marcha", title_style),
        Paragraph(
            "Resumo quantitativo gerado automaticamente a partir das metricas biomecanicas "
            "extraidas do video analisado.",
            body_style,
        ),
        Spacer(1, 0.25 * cm),
    ]

    summary_rows = [
        ["Campo", "Valor", "Campo", "Valor"],
        ["Job", job.get("job_id", "-"), "Status", job.get("status", "-")],
        ["Criado em", _format_datetime(job.get("created_at")), "Finalizado em", _format_datetime(job.get("finished_at"))],
        ["Altura", _format_number(input_summary.get("height_mm"), " mm"), "FPS", _format_number(input_summary.get("fps"), "")],
        ["Duracao", _format_number(input_summary.get("duration_ms"), " ms"), "Frames", _format_number(quality_info.get("frames_total"), "")],
        ["Frames sem deteccao", _format_number(quality_info.get("frames_without_detection"), ""), "Rotacionado", str(input_summary.get("rotated", "-"))],
    ]
    story.append(Paragraph("Resumo da analise", section_style))
    story.append(_styled_table(summary_rows, col_widths=[3.1 * cm, 5.0 * cm, 3.1 * cm, 5.0 * cm]))

    story.append(Paragraph("Metricas clinicas comparativas", section_style))
    story.append(_styled_table(_metric_summary_rows(metrics), col_widths=[6.0 * cm, 2.6 * cm, 2.6 * cm, 2.6 * cm, 2.6 * cm]))

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        plot_specs = [
            (
                "joelho_direito_graus",
                "joelho_esquerdo_graus",
                "Flexao do joelho: direito vs esquerdo",
                "Graus",
                temp_path / "joelho.png",
            ),
            (
                "quadril_direito_graus",
                "quadril_esquerdo_graus",
                "Flexao do quadril: direito vs esquerdo",
                "Graus",
                temp_path / "quadril.png",
            ),
        ]
        single_specs = [
            (
                "distancia_tornozelos_mm",
                "Distancia entre tornozelos ao longo do tempo",
                "Milimetros",
                temp_path / "tornozelos.png",
            )
        ]

        images = []
        for right_key, left_key, title, ylabel, path in plot_specs:
            if _save_comparison_plot(metrics, right_key, left_key, title, ylabel, path):
                images.append(path)
        for key, title, ylabel, path in single_specs:
            if _save_single_plot(metrics, key, title, ylabel, path):
                images.append(path)

        if images:
            story.append(Paragraph("Graficos", section_style))
            for image_path in images:
                story.append(Image(str(image_path), width=17.0 * cm, height=7.3 * cm))
                story.append(Spacer(1, 0.2 * cm))

        story.append(Paragraph("Observacoes automaticas", section_style))
        for observation in _build_observations(metrics, quality_info):
            story.append(Paragraph(f"- {observation}", body_style))

        warnings = quality_info.get("warnings") or []
        story.append(Paragraph("Qualidade da analise", section_style))
        if warnings:
            warning_text = ", ".join(str(item) for item in warnings)
        else:
            warning_text = "Nenhum aviso de qualidade registrado."
        story.append(Paragraph(warning_text, body_style))

        doc.build(story)

    return output_path


def _styled_table(rows: list[list[Any]], col_widths: list[float]) -> Any:
    """Cria uma tabela com visual consistente para o relatorio.

    Parametros:
        rows: Linhas da tabela.
        col_widths: Larguras das colunas em pontos ReportLab.

    Retorna:
        Instancia de `Table` estilizada.
    """
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle

    table = Table(rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table
