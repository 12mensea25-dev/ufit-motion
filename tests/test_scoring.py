from app.scoring import calculate_performance_breakdown


def test_perfect_score():
    sessions = [{"engagement_rating": 5.0, "session_date": "2026-03-20"}] * 5
    eod_reports = [{"report_date": "2026-03-20"}] * 20
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["performanceScore"] == 100.0


def test_formula_example_from_spec():
    # avg_engagement=4.0, eod_count=18, expected=20
    # score = (4.0/5)*50 + (18/20)*50 = 40 + 45 = 85.0
    sessions = [{"engagement_rating": 4.0, "session_date": "2026-03-15"}] * 3
    eod_reports = [{"report_date": "2026-03-15"}] * 18
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["performanceScore"] == 85.0
    assert result["averageEngagement"] == 4.0
    assert result["recentEodCount"] == 18


def test_zero_sessions_gives_zero_engagement_points():
    result = calculate_performance_breakdown([], [])
    assert result["performanceScore"] == 0.0
    assert result["averageEngagement"] is None


def test_eod_completion_capped_at_100_percent():
    sessions = [{"engagement_rating": 3.0, "session_date": "2026-03-15"}]
    eod_reports = [{"report_date": "2026-03-15"}] * 30
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["completionRate"] == 1.0
    assert result["completionPoints"] == 50.0


def test_only_last_30_days_count_for_eod():
    sessions = [{"engagement_rating": 4.0, "session_date": "2026-03-15"}]
    old_reports = [{"report_date": "2025-12-01"}] * 10
    recent_reports = [{"report_date": "2026-03-15"}] * 10
    result = calculate_performance_breakdown(sessions, old_reports + recent_reports)
    assert result["recentEodCount"] == 10
