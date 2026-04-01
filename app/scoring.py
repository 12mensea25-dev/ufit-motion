from datetime import datetime, timedelta, timezone

EXPECTED_EOD_SUBMISSIONS = 20


def calculate_performance_breakdown(session_rows, eod_report_rows, expected=EXPECTED_EOD_SUBMISSIONS):
    """
    Pure function. Returns a performance breakdown dict for one coach.

    session_rows: list of dicts with keys: engagement_rating, session_date
    eod_report_rows: list of dicts with keys: report_date
    expected: int, expected EOD submissions in 30 days (default 20)
    """
    thirty_days_ago = (
        datetime.now(timezone.utc).date() - timedelta(days=30)
    ).isoformat()

    engagement_scores = [
        float(row["engagement_rating"])
        for row in session_rows
        if row.get("engagement_rating") is not None
    ]
    average_engagement = (
        round(sum(engagement_scores) / len(engagement_scores), 2)
        if engagement_scores else None
    )

    completion_count = sum(
        1 for row in eod_report_rows
        if str(row.get("report_date") or "") >= thirty_days_ago
    )
    completion_rate = min(completion_count / expected, 1.0) if expected > 0 else 0.0

    engagement_points = round(((average_engagement or 0.0) / 5.0) * 50.0, 1)
    completion_points = round(completion_rate * 50.0, 1)
    performance_score = round(engagement_points + completion_points, 1)

    last_session_date = max(
        (str(row["session_date"] or "") for row in session_rows if row.get("session_date")),
        default="",
    )
    last_report_date = max(
        (str(row["report_date"] or "") for row in eod_report_rows if row.get("report_date")),
        default="",
    )

    return {
        "averageEngagement": average_engagement,
        "completionRate": round(completion_rate, 3),
        "completionPercent": round(completion_rate * 100.0, 1),
        "recentEodCount": completion_count,
        "recentReportCount": completion_count,
        "expectedSubmissions": expected,
        "engagementPoints": engagement_points,
        "completionPoints": completion_points,
        "performanceScore": performance_score,
        "lastSessionDate": last_session_date or None,
        "lastEodReportDate": last_report_date or None,
        "totalSessions": len(session_rows),
        "totalEodReports": len(eod_report_rows),
    }
