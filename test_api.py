import requests

URL = "http://localhost:3000"
adminToken = ""
modToken = ""
userToken = ""
roomId = ""
roomId = ""
bookingId = ""

print("\n- Registration tests: \n")

# Test to reg. users

def register_user(username, password, role):
    user_data = {
        "username": username,
        "password": password,
        "role": role
    }
    response = requests.post(f"{URL}/register", json=user_data)
    print(f"{role.capitalize()} registration response:", response.json())
    return

register_user("admin", "admin123", "admin")
register_user("mod", "mod123", "moderator")
register_user("user", "user123", "user")

# Login test
print("\n- Login tests: \n")

def login_user(username, password):
    login_data = {
        "username": username,
        "password": password
    }
    response = requests.post(f"{URL}/login", json=login_data)
    print(f"{username} login response:", response.json())
    return response.json().get("token")

adminToken = login_user("admin", "admin123")
modToken = login_user("mod", "mod123")
userToken = login_user("user", "user123")

# Test to create room
print("\n- Add room tests: \n")

def add_room(token, role, name):
    print(f"{role} add room response:")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    room_data = {
        "name": name,
        "capacity": 10,
        "type": "conference"
    }
    r = requests.post(f"{URL}/addroom", json=room_data, headers=headers)
    print("Add room:", r.json())
    return r.json().get("id")

add_room(userToken, "User", "Hell")
add_room(modToken, "Moderator", "Hell")
roomId = add_room(adminToken, "Admin:", "Hell")

# Test to get rooms
print("\n- Get rooms test: \n")

def get_rooms(token, role):
    print(f"{role} get rooms response:")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.get(f"{URL}/rooms", headers=headers)
    print("Get rooms:", r.json())

get_rooms(adminToken, "Admin")
get_rooms(modToken, "Moderator")
get_rooms(userToken, "User")

# Test to update room
print("\n- Update room test: \n")

def update_room(token, role, id, name, capacity, room_type):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    room_data = {
        "name": name,
        "capacity": capacity,
        "type": room_type
    }
    r = requests.put(f"{URL}/updateroom/{id}", json=room_data, headers=headers)
    print(f"Update room {role}:", r.json())

update_room(userToken, "User", roomId, "Hell", 20, "conference")
update_room(modToken, "Moderator (fail)", roomId, "Hell", 20, "conference")
update_room(adminToken, "Admin", roomId, "New Hell", 20, "workspace")
get_rooms(adminToken, "Admin")

# Test to delete room
print("\n- Delete room test: \n")

def delete_room(token, role, room):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.delete(f"{URL}/killroom/{room}", headers=headers)
    print(f"Delete room {role}:", r.json())

tempRoom = add_room(adminToken, "Admin", "Heven")
get_rooms(adminToken, "Admin")
delete_room(userToken, "User", tempRoom)
delete_room(modToken, "Moderator", tempRoom)
delete_room(adminToken, "Admin", tempRoom)
get_rooms(adminToken, "Admin")

# Test to book room
print("\n- Book room test: \n")
def book_room(token, role, roomId, startTime, endTime):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    booking_data = {
        "roomId": roomId,
        "startTime": startTime,
        "endTime": endTime
    }
    r = requests.post(f"{URL}/booking", json=booking_data, headers=headers)
    print(f"Book room {role}:", r.json())
    return r.json().get("id")

book_room(userToken, "User", roomId, "2024-07-01T11:00:00Z", "2024-07-01T12:00:00Z")
bookingId = book_room(modToken, "Moderator", roomId, "2024-07-01T12:00:00Z", "2024-07-01T13:30:00Z")
book_room(adminToken, "Admin", roomId, "2024-07-01T11:00:00Z", "2024-07-01T14:00:00Z")
print(f"Booking ID: {bookingId}")

# Test to get user bookings
print("\n- Get user bookings test: \n")
def get_bookings(token, role):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.get(f"{URL}/bookings", headers=headers)
    print(f"Get bookings {role}:", r.json())

get_bookings(userToken, "User")
get_bookings(modToken, "Moderator")
get_bookings(adminToken, "Admin")

print("\n- Update booking test: \n")
def update_booking(token, role, bookingId, startTime, endTime):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    booking_data = {
        "startTime": startTime,
        "endTime": endTime
    }
    r = requests.put(f"{URL}/updatebooking/{bookingId}", json=booking_data, headers=headers)
    print(f"Update booking {role}:", r.json())

update_booking(userToken, "User", bookingId, "2024-07-01T12:00:00Z", "2024-07-01T13:00:00Z")
update_booking(modToken, "Moderator", bookingId, "2024-07-01T12:00:00Z", "2024-07-01T13:00:00Z")
update_booking(adminToken, "Admin", bookingId, "2024-07-01T12:00:00Z", "2024-07-01T13:00:00Z")
get_bookings(adminToken, "Check")

print("\n- Delete booking test: \n")
def delete_booking(token, role, bookingId):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.delete(f"{URL}/deletebooking/{bookingId}", headers=headers)
    print(f"Delete booking {role}:", r.json())

delete_booking(userToken, "User", bookingId)
delete_booking(modToken, "Moderator", bookingId)
delete_booking(adminToken, "Admin", bookingId)

