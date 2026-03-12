# BokningPlattform
A school project: A backend for a coworking-space.


## How to test in terminal (Mostly for helping me with dev.)

### Create a user:
`
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d '{"username": "zac","password": "pas123" role: "admin"}'
`

### Login:
`
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" -d '{"username": "zac","password": "pas123"}'
`
After login will you resive a JSW-token.

### Create a room:
`
curl -X POST http://localhost:3000/addroom -H "Authorization: Bearer JWS-TOKEN-GOSE-HERE" -H "Content-Type: application/json" -d '{"name":"Hell","capacity":10,"type":"conference"}'
`

### Display all rooms:
`
curl -X GET http://localhost:3000/rooms -H "Authorization: Bearer JWS-TOKEN-GOSE-HERE"
`

