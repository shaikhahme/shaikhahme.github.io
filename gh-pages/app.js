fetch('../data/graph.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        var cy = cytoscape({
            container: document.getElementById('cy'),
            elements: data.elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'width': 'mapData(size, 10, 100, 20, 60)',
                        'height': 'mapData(size, 10, 100, 20, 60)',
                        'background-color': '#0074D9'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'cose'
            }
        });
    })
    .catch(error => console.error('Error loading graph:', error));