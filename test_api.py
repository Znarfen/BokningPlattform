import requests

URL = "http://localhost:3000"

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

add_room(userToken, "User", "Hell")
add_room(modToken, "Moderator", "Hell")
add_room(adminToken, "Admin:", "Hell")

# Test to get rooms
print("\n- Get rooms test: \n")

def get_rooms(token, role):
    print(f"{role} get rooms response:")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    r = requests.get(f"{URL}/rooms", headers=headers)
    print("Rooms:", r.json())

get_rooms(adminToken, "Admin")
get_rooms(modToken, "Moderator")
get_rooms(userToken, "User")

# Test to update room
print("\n- Update room test: \n")

def update_room(token, role, name, capacity, room_type):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    room_data = {
        "name": name,
        "capacity": capacity,
        "type": room_type
    }
    r = requests.put(f"{URL}/updateroom/Hell", json=room_data, headers=headers)
    print(f"Update room {role}:", r.json())

update_room(userToken, "User", "Hell", 20, "conference")
update_room(modToken, "Moderator", "Hell", 20, "conference")
update_room(adminToken, "Admin", "New Hell", 20, "workspace")
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

add_room(adminToken, "Admin", "Heven")
get_rooms(adminToken, "Admin")
delete_room(userToken, "User", "Heven")
delete_room(modToken, "Moderator", "Heven")
delete_room(adminToken, "Admin", "Heven")
get_rooms(adminToken, "Admin")
