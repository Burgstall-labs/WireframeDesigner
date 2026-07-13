# Wireframe Designer - Desktop Application

A cross-platform desktop application for creating rotating wireframe animations of 3D shapes and exporting them as animated GIFs or WebM videos.

![Wireframe Designer Screenshot](wireframe.png)

## Features

- **Native Desktop App**: Runs as a standalone application on Windows and Linux
- **Enhanced File Saving**: Native file dialogs with proper file type filtering
- **Desktop Notifications**: Get notified when exports are complete
- **No Server Required**: No need to run a local web server
- **Keyboard Shortcuts**: Full menu system with keyboard shortcuts
- **Auto-Updates**: Built-in update mechanism (future feature)

## Quick Start

### For Users

#### Windows
1. Download the latest release from the [Releases page](https://github.com/Burgstall-labs/WireframeDesigner/releases)
2. Choose between:
   - **Installer**: `Wireframe-Designer-1.0.0-x64.exe` (recommended)
   - **Portable**: `Wireframe-Designer-1.0.0-portable.exe` (no installation needed)
3. Run the installer or portable executable
4. Launch "Wireframe Designer" from your Start Menu or desktop

#### Linux
1. Download the latest release from the [Releases page](https://github.com/Burgstall-labs/WireframeDesigner/releases)
2. Download the AppImage: `Wireframe-Designer-1.0.0-x64.AppImage`
3. Make it executable: `chmod +x Wireframe-Designer-1.0.0-x64.AppImage`
4. Run it: `./Wireframe-Designer-1.0.0-x64.AppImage`

### For Developers

#### Prerequisites
- **Node.js** 16.0.0 or higher
- **npm** or **yarn**
- **Git**

#### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Burgstall-labs/WireframeDesigner.git
   cd WireframeDesigner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   # Build for current platform
   npm run build
   
   # Build for Windows
   npm run build:win
   
   # Build for Linux
   npm run build:linux
   
   # Build for all platforms
   npm run build:all
   ```

## Application Architecture

### Core Modules
- **SceneManager** (`js/scene.js`): Three.js rendering and 3D scene management
- **AnimationEngine** (`js/animation.js`): Easing functions, interpolation, and loop modes
- **ExportManager** (`js/export.js`): GIF and WebM export with progress tracking
- **UIManager** (`js/ui.js`): User interface interactions and state management

### Desktop Integration
- **electron-main.js**: Main process handling window management and native APIs
- **electron-preload.js**: Secure bridge between renderer and main processes
- **Native Features**: File dialogs, notifications, menu system

## Features Overview

### 3D Shapes
- Cube, Sphere, Cylinder, Cone, Torus
- Pyramid, Dodecahedron
- Customizable dimensions for each shape

### Animation Options
- **Position Animation**: Animate object movement in 3D space
- **Rotation Animation**: Smooth rotation with customizable angles
- **Easing Functions**: Linear, Ease-In, Ease-Out, Ease-In-Out, Elastic, Bounce
- **Loop Modes**: Normal, Ping-Pong (forward-reverse), Reverse

### Visual Customization
- **Background Color**: Any color picker
- **Wireframe Color**: Customizable line colors
- **Face Rendering**: Optional solid faces with opacity control
- **Camera Modes**: Perspective and Orthographic projection

### Export Formats
- **Animated GIF**: Universal compatibility, adjustable quality
- **WebM Video**: Smaller file sizes, modern web standard
- **Custom Resolution**: Any output size from 100x100 to 4K+
- **Frame Control**: Adjustable frame count and timing

### User Interface
- **Collapsible Sections**: Organized, space-efficient layout
- **Real-time Preview**: See animations before exporting
- **Progress Tracking**: Detailed export progress with cancellation
- **Settings Persistence**: Remembers your preferences
- **Touch Support**: Works on touch screens and tablets

## Keyboard Shortcuts

- **Ctrl/Cmd + N**: New Animation (reset all settings)
- **Ctrl/Cmd + E**: Export Animation
- **Ctrl/Cmd + Q**: Quit Application
- **F11**: Toggle Fullscreen
- **F12**: Toggle Developer Tools (development mode)

## Building and Distribution

### Build Scripts

```bash
# Development
npm start          # Run the app in development mode
npm run dev        # Same as start, with DevTools open

# Building
npm run build      # Build for current platform
npm run build:win  # Build Windows installer + portable
npm run build:linux # Build Linux AppImage + tar.gz
npm run build:all  # Build for all platforms

# Packaging (without publishing)
npm run package    # Package for current platform
npm run package:win # Package for Windows only
npm run package:linux # Package for Linux only

# Utilities
npm run clean      # Clean build directories
npm run serve      # Start web server for testing
```

### Output Files

**Windows:**
- `dist/Wireframe Designer Setup 1.0.0.exe` - Installer
- `dist/Wireframe-Designer-1.0.0-portable.exe` - Portable executable

**Linux:**
- `dist/Wireframe-Designer-1.0.0-x64.AppImage` - AppImage (recommended)
- `dist/Wireframe-Designer-1.0.0-x64.tar.gz` - Tarball

### Customizing the Build

Edit `package.json` to customize:
- Application metadata (name, description, author)
- Build targets and architectures
- Installer options
- File associations
- Auto-updater settings

## Development Notes

### Project Structure
```
├── index.html              # Main HTML file
├── css/style.css          # Application styles
├── js/                    # Application modules
│   ├── main.js           # Application entry point
│   ├── scene.js          # 3D rendering
│   ├── animation.js      # Animation engine
│   ├── export.js         # Export functionality
│   └── ui.js             # User interface
├── electron-main.js       # Electron main process
├── electron-preload.js    # Electron preload script
├── build-resources/       # Icons and assets
├── package.json          # Project configuration
└── dist/                 # Built applications
```

### Dependencies
- **Electron**: Desktop app framework
- **Three.js**: 3D graphics rendering
- **gif.js**: GIF encoding library
- **electron-builder**: Building and packaging

### Web vs Desktop

The application is designed to work both as a web app and desktop app:
- **Web Mode**: Runs in any modern browser with local server
- **Desktop Mode**: Native Electron app with enhanced features

Desktop-specific features:
- Native file saving with proper dialogs
- Desktop notifications
- Menu system with keyboard shortcuts
- Better performance and memory management
- No browser security restrictions

## Troubleshooting

### Common Issues

**"Application won't start"**
- Ensure you have the correct architecture (x64 vs x86)
- Check Windows/Linux version compatibility
- Try running from command line to see error messages

**"Export fails in browser"**
- Switch to desktop version for better export reliability
- Check available memory (large animations need more RAM)
- Try reducing frame count or resolution

**"Slow performance"**
- Close other applications to free up memory
- Reduce frame count for preview
- Use lower resolution for testing

### Development Issues

**"npm install fails"**
- Update Node.js to latest LTS version
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

**"Build fails"**
- Check build-resources directory exists
- Ensure all dependencies are installed
- Try cleaning: `npm run clean` then rebuild

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly on target platforms
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Burgstall-labs/WireframeDesigner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Burgstall-labs/WireframeDesigner/discussions)
- **Email**: Contact the maintainers for security issues

---

Built with ❤️ using [Electron](https://electronjs.org/) and [Three.js](https://threejs.org/) 