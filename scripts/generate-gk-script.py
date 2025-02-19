import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Load topics
with open('data/topics.json', 'r') as f:
    topics = json.load(f)

# Create nodes list
nodes = []
uniqueId = 0
for topic in topics:
    nodes.append({
        "data": {
            "id": uniqueId,
            "label": topic['label'],
            "desc": topic['desc'],
            "size": topic['rank']
        }
    })
    uniqueId = uniqueId + 1

# Prepare descriptions for TF-IDF
descriptions = [topic['longDesc'] for topic in topics]
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(descriptions)
sim_matrix = cosine_similarity(tfidf_matrix)

# Create edges list (avoid self-loops, consider only one direction)
threshold = 0.2
edges = []

for i in range(len(nodes)):
    for j in range(i + 1, len(nodes)):
        if sim_matrix[i][j] > threshold:
            edges.append({
                "data": {
                    "source": nodes[i]['data']['id'],
                    "target": nodes[j]['data']['id'],
                    "weight": sim_matrix[i][j]
                }
            })

# Create final graph JSON
graph_json = {
    "elements": {
        "nodes": nodes,
        "edges": edges
    }
}

# Save JSON file
with open('data/graph.json', 'w') as f:
    json.dump(graph_json, f, indent=2)
