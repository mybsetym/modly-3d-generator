"use strict";

const path = require("path");
const fs = require("fs");
const https = require("https");

const processor = async (input, params, context) => {
    if (!input.filePath) {
        throw new Error("image-to-3d: input.filePath is required");
    }

    const prompt = String(params["prompt"] ?? "");
    const quality = String(params["quality"] ?? "medium");

    context.log(`Generating 3D model from: ${input.filePath}`);
    context.progress(10, "Preparing image...");

    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(input.filePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(input.filePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    context.progress(30, "Calling AI model...");

    // For demo: create a placeholder GLB
    // In production, call Fal.ai or similar API
    const modelDir = path.join(context.workspaceDir, "Models");
    fs.mkdirSync(modelDir, { recursive: true });
    const outputPath = path.join(modelDir, `model-${Date.now()}.glb`);

    // Create minimal valid GLB file
    const glbBuffer = createMinimalGLB();
    fs.writeFileSync(outputPath, glbBuffer);

    context.progress(100, "Done!");
    context.log(`3D model saved to: ${outputPath}`);

    return { filePath: outputPath };
};

function createMinimalGLB() {
    // Minimal GLB with a simple cube
    const gltfJson = {
        asset: { version: "2.0", generator: "Modly Image to 3D" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{
            primitives: [{
                attributes: { POSITION: 0 },
                indices: 1
            }]
        }],
        accessors: [
            {
                bufferView: 0,
                componentType: 5126,
                count: 8,
                type: "VEC3",
                max: [1, 1, 1],
                min: [-1, -1, -1]
            },
            {
                bufferView: 1,
                componentType: 5123,
                count: 36,
                type: "SCALAR"
            }
        ],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: 96 },
            { buffer: 0, byteOffset: 96, byteLength: 72 }
        ],
        buffers: [{ byteLength: 168 }]
    };

    // Cube vertices
    const positions = new Float32Array([
        -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1,
        -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1
    ]);

    // Cube indices (12 triangles)
    const indices = new Uint16Array([
        0, 1, 2,  0, 2, 3,  4, 6, 5,  4, 7, 6,
        0, 4, 5,  0, 5, 1,  2, 6, 7,  2, 7, 3,
        0, 3, 7,  0, 7, 4,  1, 5, 6,  1, 6, 2
    ]);

    const jsonStr = JSON.stringify(gltfJson);
    const jsonPad = (4 - (jsonStr.length % 4)) % 4;
    const jsonChunkLen = jsonStr.length + jsonPad;
    const binData = Buffer.concat([
        Buffer.from(positions.buffer),
        Buffer.from(indices.buffer)
    ]);
    const binPad = (4 - (binData.length % 4)) % 4;
    const binChunkLen = binData.length + binPad;

    const totalLen = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
    const buf = Buffer.alloc(totalLen);

    // Header
    buf.writeUInt32LE(0x46546C67, 0); // magic: glTF
    buf.writeUInt32LE(2, 4); // version
    buf.writeUInt32LE(totalLen, 8); // length

    // JSON chunk
    buf.writeUInt32LE(jsonChunkLen, 12);
    buf.writeUInt32LE(0x4E4F534A, 16); // type: JSON
    buf.write(jsonStr, 20);
    for (let i = 0; i < jsonPad; i++) buf[20 + jsonStr.length + i] = 0x20;

    // BIN chunk
    const binOffset = 20 + jsonChunkLen;
    buf.writeUInt32LE(binChunkLen, binOffset);
    buf.writeUInt32LE(0x004E4942, binOffset + 4); // type: BIN
    binData.copy(buf, binOffset + 8);
    for (let i = 0; i < binPad; i++) buf[binOffset + 8 + binData.length + i] = 0;

    return buf;
}

module.exports = processor;
