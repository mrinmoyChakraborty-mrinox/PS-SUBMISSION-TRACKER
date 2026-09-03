def parse_submission_count(raw: str) -> dict:
    """
    Parse '327/500' into {count: 327, capacity: 500, raw: '327/500'}
    Must raise ValueError on invalid format.
    Never silently returns 0.
    """
    if "/" not in raw:
        raise ValueError(f"Invalid format: missing slash in '{raw}'")
    
    parts = raw.split("/")
    if len(parts) != 2:
        raise ValueError(f"Invalid format: multiple slashes in '{raw}'")
        
    try:
        count = int(parts[0].strip())
        capacity = int(parts[1].strip())
    except ValueError:
        raise ValueError(f"Invalid format: non-integer values in '{raw}'")
        
    return {
        "count": count,
        "capacity": capacity,
        "raw": raw
    }
