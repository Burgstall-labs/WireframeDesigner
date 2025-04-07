# Wireframe Animation Designer

A simple browser-based tool to create rotating wireframe animations of basic 3D shapes (Cube, Sphere, Cylinder, Cone, Torus) and export them as animated GIFs.

![Screenshot Placeholder](placeholder.png)
*(Suggestion: Replace placeholder.png with an actual screenshot or GIF of the tool in action)*

## Features

*   Select from various basic 3D shapes.
*   Customize dimensions (Width, Height, Depth/Radius).
*   Set background, wireframe, and face colors.
*   Toggle between wireframe-only (edges) or full wireframe display.
*   Optionally show solid faces with adjustable opacity.
*   Define animation parameters:
    *   Start and End rotation angles (X and Y axes).
    *   Number of frames.
    *   Frame delay (animation speed).
*   Set output resolution for the GIF.
*   Live preview of the animation within the tool.
*   Render and download the animation as an animated GIF.

## Prerequisites

*   A modern web browser (Chrome, Firefox, Edge, Safari recommended).
*   **Python 3** installed (for running the local web server).
*   **Manual Download:** You need to manually download `gif.js` and `gif.worker.js`.

## Getting Started / Running Locally

Because browsers have security restrictions for loading web workers (`gif.worker.js`) from local `file:///` paths, you **must** run this tool from a simple local web server.

1.  **Clone or Download:** Get the repository files onto your computer.
    ```bash
    git clone https://github.com/Burgstall-labs/WireframeDesigner.git
    cd WireframeDesigner
    ```

2.  **Manually Add GIF Scripts:**
    *   Download `gif.js` from: [https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js](https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js)
    *   Download `gif.worker.js` from: [https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js](https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js)
    *   **Place both `gif.js` and `gif.worker.js` files in the SAME directory as the `wireframe-designer-with-webp-gif.html` file.**

3.  **Start the Local Server:**
    *   Open a terminal or command prompt **in the directory where the HTML and JS files are located**.
    *   Run the following command (ensure Python 3 is in your system's PATH):
        ```bash
        python -m http.server
        ```
    *   You should see output like `Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...`. The port might be different if 8000 is already in use.

4.  **Access the Tool:**
    *   Open your web browser.
    *   Navigate to `http://localhost:8000/wireframedesigner.html` (or the specific port number shown in your terminal).

## Usage

1.  Use the controls on the left panel to select a shape and customize its appearance and animation properties.
2.  Click "Preview Animation" to see a live preview of the rotation in the main window. Click again to stop.
3.  Click "Create GIF Animation" to render the frames and generate the animated GIF. This may take some time depending on the resolution and frame count. Progress will be shown.
4.  Once rendering is complete, a preview of the GIF will appear on the right.
5.  Click "Download GIF" to save the generated animation file.
6.  Click "Close" to hide the preview panel.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.