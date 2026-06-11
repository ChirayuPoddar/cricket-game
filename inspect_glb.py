import struct
import json

def read_glb_json(filepath):
    try:
        with open(filepath, "rb") as f:
            # GLB Header: magic (4 bytes), version (4 bytes), length (4 bytes)
            magic = f.read(4)
            version = struct.unpack("<I", f.read(4))[0]
            length = struct.unpack("<I", f.read(4))[0]
            
            # First chunk header: chunkLength (4 bytes), chunkType (4 bytes)
            chunk_length = struct.unpack("<I", f.read(4))[0]
            chunk_type = f.read(4)
            
            if chunk_type == b"JSON":
                json_data = f.read(chunk_length)
                return json.loads(json_data.decode("utf-8"))
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return None

# Inspect XBot
xbot_gltf = read_glb_json("./assets/player/bot/XBot.glb")
running_gltf = read_glb_json("./assets/player/animation/Running.glb")

print("--- XBOT NODES ---")
if xbot_gltf and "nodes" in xbot_gltf:
    xbot_nodes = [node.get("name") for node in xbot_gltf["nodes"] if node.get("name")]
    print(f"Total nodes: {len(xbot_nodes)}")
    print("Sample nodes:", xbot_nodes[:15])
else:
    print("Failed to read XBot nodes")

print("\n--- RUNNING NODES ---")
if running_gltf and "nodes" in running_gltf:
    running_nodes = [node.get("name") for node in running_gltf["nodes"] if node.get("name")]
    print(f"Total nodes: {len(running_nodes)}")
    print("Sample nodes:", running_nodes[:15])
else:
    print("Failed to read Running nodes")

# Compare node structures
if xbot_gltf and running_gltf:
    xbot_set = set(xbot_nodes)
    running_set = set(running_nodes)
    only_in_xbot = xbot_set - running_set
    only_in_run = running_set - xbot_set
    print(f"\nNodes only in XBot: {len(only_in_xbot)} (Sample: {list(only_in_xbot)[:5]})")
    print(f"Nodes only in Running: {len(only_in_run)} (Sample: {list(only_in_run)[:5]})")
