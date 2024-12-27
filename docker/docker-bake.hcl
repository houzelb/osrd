variable "OSRD_GIT_DESCRIBE" {}

group "default" {
  targets = [
    "core",
    "editoast",
    "gateway-front",
    "osrdyne",
  ]
}

target "base" {
  args = {
    OSRD_GIT_DESCRIBE = "${OSRD_GIT_DESCRIBE}"
  }
}

########
# Core #
########

target "core" {
  inherits = ["base"]
  context = "core"
  dockerfile = "Dockerfile"
  target = "running_env"
  contexts = {
    test_data = "./tests/data"
    static_assets = "./assets"
  }
}

############
# Editoast #
############

target "editoast" {
  inherits = ["base"]
  context = "editoast"
  dockerfile = "Dockerfile"
  target = "running_env"
  contexts = {
    static_assets = "./assets"
  }
}

#########
# Front #
#########

target "front-build" {
  inherits = ["base"]
  context = "front"
  dockerfile = "Dockerfile"
  target = "build"
}

###########
# Gateway #
###########

target "gateway-standalone" {
  inherits = ["base"]
  context = "gateway"
  dockerfile = "Dockerfile"
  target = "running_env"
}

target "gateway-front" {
  inherits = ["base"]
  dockerfile = "gateway-front.dockerfile"
  context = "docker"
  contexts = {
    gateway_src = "./gateway"
    gateway_build = "target:gateway-standalone"
    front_build = "target:front-build"
  }
}

###########
# OSRDyne #
###########

target "osrdyne" {
  inherits = ["base"]
  context = "osrdyne"
  dockerfile = "Dockerfile"
  target = "running_env"
}
