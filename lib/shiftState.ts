// Server-side shift state. Change via POST /api/admin/shift

/*
# Check current shift
curl http://localhost:3000/api/admin/shift -H "x-admin-secret: voltedge2026"
# Switch to shift 2
curl -X POST http://localhost:3000/api/admin/shift -H "Content-Type: application/json" -H "x-admin-secret: voltedge2026" -d '{"shift": 2}'
# Or pass password in body:
curl -X POST http://localhost:3000/api/admin/shift -H "Content-Type: application/json" -d '{"shift": 2, "password": "voltedge2026"}'
*/

let currentShift: number = 1;

export function getCurrentShift(): number {
  return currentShift;
}

export function setCurrentShift(shift: number): void {
  if (shift === 1 || shift === 2) {
    currentShift = shift;
  }
}
