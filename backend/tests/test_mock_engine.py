from app.services.fitting_metadata import get_fitting_coordinate_names
from app.services.mock_engine import MockGaitAnalysisEngine


def test_mock_engine_returns_frontend_contract_shape():
    result = MockGaitAnalysisEngine().process_video("input.mp4", height_mm=1750)

    assert result["status"] == "sucesso_mock"
    assert len(result["pose3d"]) == 30
    assert len(result["pose3d"][0]) == 17
    assert len(result["kinematics"]["timestamps"]) == 30
    assert len(result["kinematics"]["angles"]) == 30
    assert len(result["kinematics"]["angles"][0]) == len(get_fitting_coordinate_names())
