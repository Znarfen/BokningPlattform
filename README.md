# BokningPlattform
Ett backend skolprojekt för en bokningsplattform. Själva servern är skrivet i JavaScript. Det finns två testfilter: soket_test.js och test_api.py för att testa serven.

## Beroenden

### JavaScript (Node)
Node.js behövs för at köra serven.

Bibliotek som krävs:
- expres
- bcrypt
- mongodb-memory-server
- mongoose
- jsonwebtoken
- socket.io

### Python3
Python behövs bara om man vill testa servern med test_api.py.

## Körning av server (lokalt)
Far att starta skälva servern lokalisera dig till /BokingPlatform i terminalen och kör:

    node server.js

### Testa serven (behövs inte köras)

För att se realtidskommunikation kör:

    node soket_test.js

Kör endast testet efter att ha startat serven. Testet skapar tre användare (admin, moderator och en user) och två rum (ett tas bort) och testar att utföra bokningar. För att testa serven kör:

    python3 test_api.py

Om man vill se debug-logar ändra i server.js:
    
    const debug = false; till -> const debug = true;

Då kommer man även åt rutten /debug

## Rutter
Man kan se alla ruter i server.js filen.

#### /debug
Om debug variabeln är satt till "true" kan man få ut alla användare och rum. (Endast till för utveckling.)

#### /register
Skapar en ny användare. Kräver användarnamn (username), lösenord (password) och roll (role) i body. Om rollen inte är definierad sätts programmet "user" som standard. Roller som finns är: "user", "admin" och "moderator".

#### /login
Logga in till ett konto. Kräver användarnamn och lösenord (username, password) i body. Om inloggningen lyckades får man en JWT token.

#### /addroom
Används för att skapa rum. Kräver namn, kapacitet och typ (name, capacity, type) i body. Finns två typer av rum: "workspace" och "conference". Kräver "create" behörighet. Man får ut namnet på rummet och id för rummet om allt går bra.

#### /rooms
Visar alla rum (med id, namn, kapacitet och typ). Kräver "read" behörighet.

#### /updateroom/:id
Uppdaterar ett rum där "capacity", "type" och "name" i body överskrider valda rum. Id i rutten är det valda rummets id. Kräver "update" behörighet.

#### /killroom/:id
Tar bort ett rum. Id i rutten är rummets id. Kräver "remove" behörighet.

#### /booking
Kräver "roomId", "startTime" och "endTime" i body. Om allt går bra görs en bokning av rummet. Man får ut bokningens id.

#### /bookings
Visar alla bokningar användaren har skapat om man har "read" behörighet visas alla bokningar som finns i systemet.

#### /updatebooking/:id
Uppdaterar en bokning, kräver att användaren har skapat bokningen eller har behörighet "update". Ersätter "startTime" och "endTime" till det som finns i body.

#### /deletebooking/:id
Tar bort en bokning, kräver att användaren har skapat bokningen eller har "remove" behörighet.

## Muduler

### Användare (models/User.js)
En användare kräver namn (username) och lösenord (password) och roll (role). Det fins tre olik roler av användare: "user" (standard), "moderator" och "admin".

#### Behörigheter för olika användare:
- "user": &emsp;&emsp;&emsp;    Har inga speciella behörigheter.
- "moderator":&nbsp;            "update", "read"
- "admin": &emsp;&emsp;&nbsp;   "create", "remove", "update", "read" (alla)

### Rum (models/Room.js)
Ett rum behöver ha namn (name), kapacitet (capacity) och typ (type) (antingen "workspace" eller "conference").

### Bokningar (models/Booking.js)
En bokning består av rums id (roomId), användar id från den som har skapat bokningen (userId), starttid (startTime) och sluttid (endTime).

