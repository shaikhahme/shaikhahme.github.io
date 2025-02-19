import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Load topics
with open('data/topics.json', 'r') as f:
    topics = json.load(f)

# Create nodes list
nodes = []
for topic in topics:
    nodes.append({
        "data": {
            "id": topic['name'],
            "label": topic['desc'],
            "size": topic['rank']
        }
    })

# Prepare descriptions for TF-IDF
descriptions = [topic['desc'] for topic in topics]
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(descriptions)
sim_matrix = cosine_similarity(tfidf_matrix)

# Create edges list (avoid self-loops, consider only one direction)
threshold = 0.3
edges = []

for i in range(len(topics)):
    for j in range(i + 1, len(topics)):
        if sim_matrix[i][j] > threshold:
            edges.append({
                "data": {
                    "source": topics[i]['name'],
                    "target": topics[j]['name'],
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
