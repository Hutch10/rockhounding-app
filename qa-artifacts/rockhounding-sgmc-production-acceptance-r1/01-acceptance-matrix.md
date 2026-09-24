# Acceptance matrix

A success: transport YES, user SUCCESS, display shown, geology only.
B HTTP 504: transport YES, user PROVIDER_UNAVAILABLE.
C timeout: transport YES, user PROVIDER_UNAVAILABLE.
D zero features: transport YES, user NO_SGMC_POLYGON_RETURNED, absence false.
E outside coverage: transport NO, user OUTSIDE_PROVIDER_COVERAGE.
F partial: transport YES, user PARTIAL_UNSAFE, units hidden.
G governance suspended: transport NO, user PROVIDER_UNAVAILABLE.
H PUBLIC_DISPLAY denied: transport YES, display blocked, units hidden.
I disclosure UNKNOWN: transport YES, user DISCLOSURE_WITHHELD.
J admission rejected: transport YES, user PROVIDER_UNAVAILABLE, no units.
K malformed box: transport NO, user BOUNDS_REJECTED.
L oversized box: transport NO, user BOUNDS_REJECTED.
M offline: client copy says unavailable offline, not no geology.
N feature disabled: transport NO, result null.
