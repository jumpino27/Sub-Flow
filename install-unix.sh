#!/usr/bin/env sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

echo
echo "========================================"
echo " SubFlow macOS/Linux installer"
echo "========================================"
echo

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

try_install_node() {
  os_name="$(uname -s 2>/dev/null || echo unknown)"

  if [ "$os_name" = "Darwin" ]; then
    if command_exists brew; then
      echo "Installing Node.js with Homebrew..."
      brew install node
      return $?
    fi

    echo "Node.js was not found and Homebrew is not installed."
    echo "Install Node.js LTS from https://nodejs.org/ or install Homebrew, then run this again."
    return 1
  fi

  if command_exists apt-get; then
    echo "Installing Node.js and npm with apt..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
    return $?
  fi

  if command_exists dnf; then
    echo "Installing Node.js and npm with dnf..."
    sudo dnf install -y nodejs npm
    return $?
  fi

  if command_exists yum; then
    echo "Installing Node.js and npm with yum..."
    sudo yum install -y nodejs npm
    return $?
  fi

  if command_exists pacman; then
    echo "Installing Node.js and npm with pacman..."
    sudo pacman -Sy --needed nodejs npm
    return $?
  fi

  if command_exists zypper; then
    echo "Installing Node.js and npm with zypper..."
    sudo zypper install -y nodejs npm
    return $?
  fi

  echo "Node.js was not found and no supported package manager was detected."
  echo "Install Node.js LTS from https://nodejs.org/ and run this again."
  return 1
}

ensure_node() {
  if ! command_exists node || ! command_exists npm; then
    try_install_node || return 1
  fi

  if ! command_exists node || ! command_exists npm; then
    echo "Node.js/npm is still unavailable after installation attempt."
    return 1
  fi

  node_major="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
  if [ "$node_major" -lt 18 ]; then
    echo "Node.js 18 or newer is required. Current version: $(node -v)"
    echo "Please install Node.js LTS from https://nodejs.org/ and run this again."
    return 1
  fi

  echo "Node: $(node -v)"
  echo "npm:  $(npm -v)"
}

install_dependencies() {
  echo
  if [ -x node_modules/.bin/next ]; then
    echo "SubFlow dependencies are already installed."
    return 0
  fi

  echo "Installing or repairing SubFlow dependencies..."
  npm install
}

write_start_script() {
  echo
  echo "Creating start.sh..."
  cat > start.sh <<'EOF'
#!/usr/bin/env sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Run ./install-unix.sh first."
  exit 1
fi

if [ ! -x node_modules/.bin/next ]; then
  echo "Dependencies are missing or incomplete. Installing now..."
  npm install
fi

url="http://127.0.0.1:3100"
echo "Starting SubFlow at $url"

(
  sleep 3
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
) &

npm run dev -- --hostname 127.0.0.1 --port 3100
EOF
  chmod +x start.sh
}

ensure_node
install_dependencies
write_start_script

echo
echo "Done. Run ./start.sh to start SubFlow."
