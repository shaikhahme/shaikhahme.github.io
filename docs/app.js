fetch('./data/graph.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(jsonData => {
        var cy = cytoscape({
                     container: document.getElementById('cy'),

                     elements: jsonData.elements,

                     style: [
                          {
                                 selector: 'node',
                                 style: {
                                     'label': 'data(label)',
                                     'width': 'mapData(size, 0, 10, 0, 1000)',
                                     'height': 'mapData(size, 0, 10, 0, 1000)',
                                     'background-color': '#9966CC',
                                     'color': 'white',  // Node label color
                                     'text-valign': 'center',  // Center text vertically
                                     'text-halign': 'center',  // Center text horizontally
                                     'font-size': 'mapData(size, 0, 10, 12px, 100px)'  // Adjust font size if needed
                                 }
                             },
                          {
                                 selector: 'edge',
                                 style: {
                                     'width': 2,
                                     'line-color': '#90EE90',  // Light green
                                     'target-arrow-color': '#90EE90',  // Light green
                                     'curve-style': 'bezier'
                                 }
                             },
                          {
                          selector: 'edge.highlighted',
                          style: {
                                'line-color': '#61bffc',
                                'width': 20
                              }
                          },
                          {
                          selector: '.faded',
                          style: {
                              'opacity': 0.25,
                              'text-opacity': 0.25
                          }
                          }
                     ],
                     layout: {
                        name: 'concentric',
                        animate: true,
                        animationDuration: 1000,
                        concentric: function(node) {
                        // Example: use node degree as the concentric value
                        return node.degree();
                        },
                        levelWidth: function(nodes) {
                        return nodes.maxDegree() / 5;
                        },
                        padding: 2             // Start from a structured initial position if available
                     }
                 });

         cy.ready(function() { //events block
            let ogLabel = '';
            cy.on('cxttapstart', 'node', function(e) {
                 let node = e.target;  // Get the clicked node
                 ogLabel=node.data('label')
                 node.data('label',node.data('desc'));
                 console.log("registered");
             });
            cy.on('cxttapend', 'node', function(e) {
              let node = e.target;  // Get the clicked node
              node.data('label',ogLabel);
              console.log("registered");
            });
            cy.on('mouseover', 'node', function(e) {
                var node = e.target;
                cy.elements().addClass('faded');
                node.removeClass('faded');
                var connectedEdges = node.connectedEdges();
                connectedEdges.removeClass('faded');
                connectedEdges.connectedNodes().removeClass('faded');
                node.connectedEdges().addClass('highlighted');
              });
            cy.on('mouseout', 'node', function(e) {
            var node = e.target;
            cy.elements().removeClass('faded');
            node.connectedEdges().removeClass('highlighted');
            });
          });

    })
    .catch(error => console.error('Error loading graph:', error));
document.getElementById('cy').style.backgroundColor = 'black';

