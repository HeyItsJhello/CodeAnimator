forCSPathway = True

def welcomeToCS():
    print("Welcome to the Franklin High CS Pathway!")
    print("This is one of our students projects, ")
    print("Show off your code in a way that isn't just a static image!")

def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return None
