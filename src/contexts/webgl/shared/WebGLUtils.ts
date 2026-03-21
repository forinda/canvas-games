/**
 * WebGLUtils.ts — Core WebGL2 helper functions.
 *
 * These utilities wrap common boilerplate operations (shader compilation,
 * program linking, buffer/texture/VAO creation) so that individual demos
 * can stay focused on their own rendering logic.
 *
 * All functions operate on a raw WebGL2RenderingContext — no frameworks.
 */

// ---------------------------------------------------------------------------
// Shader compilation
// ---------------------------------------------------------------------------

/**
 * Compile a single GLSL shader of the given type.
 *
 * @param gl     - The WebGL2 rendering context.
 * @param type   - `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`.
 * @param source - GLSL source code string.
 * @returns The compiled WebGLShader.
 * @throws If compilation fails, an error with the info log is thrown.
 */
export function compileShader(
	gl: WebGL2RenderingContext,
	type: GLenum,
	source: string,
): WebGLShader {
	const shader = gl.createShader(type);

	if (!shader) {
		throw new Error("Failed to create shader object.");
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader) ?? "(no info log)";
		const typeName = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";

		gl.deleteShader(shader);
		throw new Error(`${typeName} shader compilation failed:\n${log}`);
	}

	return shader;
}

// ---------------------------------------------------------------------------
// Program creation (compile + link)
// ---------------------------------------------------------------------------

/**
 * Create a linked WebGLProgram from vertex and fragment shader source strings.
 *
 * @param gl      - The WebGL2 rendering context.
 * @param vertSrc - Vertex shader GLSL source.
 * @param fragSrc - Fragment shader GLSL source.
 * @returns The linked WebGLProgram.
 * @throws If either shader fails to compile or the program fails to link.
 */
export function createProgram(
	gl: WebGL2RenderingContext,
	vertSrc: string,
	fragSrc: string,
): WebGLProgram {
	const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
	const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

	const program = gl.createProgram();

	if (!program) {
		gl.deleteShader(vertShader);
		gl.deleteShader(fragShader);
		throw new Error("Failed to create program object.");
	}

	gl.attachShader(program, vertShader);
	gl.attachShader(program, fragShader);
	gl.linkProgram(program);

	// Shaders can be detached and deleted after linking — the GPU keeps its own
	// copy.  Cleaning up here prevents resource leaks if the caller forgets.
	gl.detachShader(program, vertShader);
	gl.detachShader(program, fragShader);
	gl.deleteShader(vertShader);
	gl.deleteShader(fragShader);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program) ?? "(no info log)";

		gl.deleteProgram(program);
		throw new Error(`Program linking failed:\n${log}`);
	}

	return program;
}

// ---------------------------------------------------------------------------
// Buffer creation
// ---------------------------------------------------------------------------

/**
 * Create a WebGL buffer and upload data into it.
 *
 * @param gl     - The WebGL2 rendering context.
 * @param data   - Typed array (Float32Array, Uint16Array, etc.) to upload.
 * @param target - Buffer bind target. Defaults to `gl.ARRAY_BUFFER`.
 * @param usage  - Usage hint. Defaults to `gl.STATIC_DRAW`.
 * @returns The created WebGLBuffer with data already uploaded.
 */
export function createBuffer(
	gl: WebGL2RenderingContext,
	data: BufferSource,
	target: GLenum = gl.ARRAY_BUFFER,
	usage: GLenum = gl.STATIC_DRAW,
): WebGLBuffer {
	const buffer = gl.createBuffer();

	if (!buffer) {
		throw new Error("Failed to create buffer object.");
	}

	gl.bindBuffer(target, buffer);
	gl.bufferData(target, data, usage);
	// Unbind so callers don't accidentally modify this buffer later.
	gl.bindBuffer(target, null);

	return buffer;
}

// ---------------------------------------------------------------------------
// Texture creation
// ---------------------------------------------------------------------------

/**
 * Create a 2D texture from an image or canvas element.
 *
 * The texture is configured with sensible defaults:
 *   - LINEAR min/mag filtering
 *   - CLAMP_TO_EDGE wrapping
 *   - Automatic mipmap generation
 *
 * @param gl    - The WebGL2 rendering context.
 * @param image - Source image (HTMLImageElement, HTMLCanvasElement, or
 *                ImageBitmap).
 * @returns The created WebGLTexture.
 */
export function createTexture(
	gl: WebGL2RenderingContext,
	image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): WebGLTexture {
	const texture = gl.createTexture();

	if (!texture) {
		throw new Error("Failed to create texture object.");
	}

	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Upload pixel data from the image source.
	gl.texImage2D(
		gl.TEXTURE_2D,
		0, // mip level
		gl.RGBA, // internal format
		gl.RGBA, // source format
		gl.UNSIGNED_BYTE, // source type
		image,
	);

	// Generate mipmaps for higher-quality downscaling.
	gl.generateMipmap(gl.TEXTURE_2D);

	// Filtering — trilinear with mipmaps for minification, linear for mag.
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR_MIPMAP_LINEAR,
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	// Wrapping — clamp prevents edge bleeding on non-power-of-two textures.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
}

// ---------------------------------------------------------------------------
// VAO creation
// ---------------------------------------------------------------------------

/**
 * Create a Vertex Array Object (VAO).
 *
 * VAOs capture vertex attribute state so you can switch between different
 * meshes with a single `bindVertexArray` call instead of reconfiguring
 * every attribute each frame.
 *
 * @param gl - The WebGL2 rendering context.
 * @returns A new, unbound WebGLVertexArrayObject.
 */
export function createVAO(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
	const vao = gl.createVertexArray();

	if (!vao) {
		throw new Error("Failed to create vertex array object.");
	}

	return vao;
}
