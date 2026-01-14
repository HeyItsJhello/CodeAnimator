extends Camera2D
class_name MainCamera

const MAX_DISTANCE = 64
var target_distance = 0

var mainTarget: Node2D = null
var secondaryTarget: Node2D = null

@onready var shake_timer = $shake_timer
@onready var shake_intensity = 0

var default_offset = offset

func _ready():
	Global.screenshake.connect(shake)
	Global.changeLimit.connect(set_limits)
	Global.newMainCameraTarget.connect(set_main_target)
	Global.newSecondaryCameraTarget.connect(set_second_target)
	Global.removeSecondaryCameraTarget.connect(remove_second_target)
	Global.newCameraLimits.connect(set_limits)
	set_process(false)

func _physics_process(_delta):
	if mainTarget != null:
		global_position.x = mainTarget.global_position.x
		global_position.y = mainTarget.global_position.y
	else:
		if secondaryTarget != null:
			mainTarget = secondaryTarget
			secondaryTarget = null
		else: return

	if secondaryTarget != null:
		var direction = mainTarget.global_position.direction_to(secondaryTarget.global_position)
		var target_pos = mainTarget.global_position + (direction * target_distance)
		target_distance = mainTarget.global_position.distance_to(secondaryTarget.global_position) / 2
		position.x = target_pos.x
		position.y = target_pos.y


func set_main_target(target: Node2D):
	mainTarget = target

func set_second_target(target: Node2D):
	secondaryTarget = target

func remove_second_target():
	secondaryTarget = null

func set_limits(LimitRight: float, LimitDown: float, LimitLeft: float, LimitUp: float):
	limit_bottom = round(LimitDown)
	limit_top = round(LimitUp)
	limit_left = round(LimitLeft)
	limit_right = round(LimitRight)

# SCREENSHAKE -------------------------------------------------------------------------------------------------
func _process(_delta):
	var shake_vector = Vector2(randf_range(-1, 1) * shake_intensity, randf_range(-1, 1) * shake_intensity)
	var tween = create_tween()
	tween.tween_property(self, "offset", shake_vector, 0.1)

func shake(intensity, time):
	shake_intensity = intensity
	set_process(true)
	shake_timer.start(time)

func _on_shake_timer_timeout():
	set_process(false)
	var tween = create_tween()
	tween.tween_property(self, "offset", default_offset, 0.1)