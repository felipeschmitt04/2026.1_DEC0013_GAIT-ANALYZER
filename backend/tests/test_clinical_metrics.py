import app.services.clinical_metrics as clinical_metrics
import pytest


def test_calculate_distance_3d_returns_zero_for_same_point():
    p1 = [0, 0, 0]
    p2 = [0, 0, 0]

    distance = clinical_metrics.calculate_distance_3d(p1, p2)

    assert distance == 0.0

def test_calculate_distance_3d_between_two_points():
    p1 = [0,0,0]
    p2 = [3,4,0]

    distance = clinical_metrics.calculate_distance_3d(p1, p2)

    assert distance == 5.0

def test_calculate_angle_3d_returns_zero_for_straight_line():
    p1 = [0,0,0]
    p2 = [1,0,0]
    p3 = [2,0,0]

    angle = clinical_metrics.calculate_angle_3d(p1,p2,p3)

    assert angle == 0.0

def test_calculate_angle_3d_returns_90_for_right_angle():
    p1 = [1,0,0]
    p2 = [0,0,0]
    p3 = [0,1,0]

    angle = clinical_metrics.calculate_angle_3d(p1,p2,p3)

    assert angle == 90.0