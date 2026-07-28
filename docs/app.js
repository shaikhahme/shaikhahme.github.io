(function () {
    'use strict';

    var container = document.getElementById('cy');
    if (!container) return;

    fetch('./data/graph.json')
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(function (jsonData) {
            var cy = cytoscape({
                container: container,
                elements: jsonData.elements,

                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(label)',
                            'width': 'mapData(size, 0, 10, 18, 140)',
                            'height': 'mapData(size, 0, 10, 18, 140)',
                            'background-color': '#1f1f21',
                            'border-width': 2,
                            'border-color': '#3a3a3a',
                            'color': '#ece7e2',
                            'text-valign': 'center',
                            'text-halign': 'center',
                            'font-family': 'JetBrains Mono, monospace',
                            'font-size': 'mapData(size, 0, 10, 9px, 22px)',
                            'text-outline-width': 2,
                            'text-outline-color': '#0c0c0d',
                            'transition-property': 'background-color, border-color',
                            'transition-duration': '0.25s'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 1.5,
                            'line-color': '#4a2426',
                            'target-arrow-color': '#4a2426',
                            'curve-style': 'bezier',
                            'opacity': 0.55
                        }
                    },
                    {
                        selector: 'node:active',
                        style: {
                            'background-color': '#B3000B',
                            'border-color': '#d81324'
                        }
                    },
                    {
                        selector: 'edge.highlighted',
                        style: {
                            'line-color': '#B3000B',
                            'target-arrow-color': '#B3000B',
                            'width': 3,
                            'opacity': 1
                        }
                    },
                    {
                        selector: '.faded',
                        style: {
                            'opacity': 0.12
                        }
                    }
                ],

                layout: {
                    name: 'concentric',
                    animate: true,
                    animationDuration: 1400,
                    concentric: function (node) {
                        return node.degree();
                    },
                    levelWidth: function (nodes) {
                        return nodes.maxDegree() / 5;
                    },
                    padding: 30
                }
            });

            cy.ready(function () {
                var originalLabel = '';

                cy.on('cxttapstart', 'node', function (e) {
                    var node = e.target;
                    originalLabel = node.data('label');
                    node.data('label', node.data('desc'));
                });

                cy.on('cxttapend', 'node', function (e) {
                    e.target.data('label', originalLabel);
                });

                cy.on('mouseover', 'node', function (e) {
                    var node = e.target;
                    cy.elements().addClass('faded');
                    node.removeClass('faded');
                    var connectedEdges = node.connectedEdges();
                    connectedEdges.removeClass('faded');
                    connectedEdges.connectedNodes().removeClass('faded');
                    connectedEdges.addClass('highlighted');
                });

                cy.on('mouseout', 'node', function (e) {
                    cy.elements().removeClass('faded');
                    e.target.connectedEdges().removeClass('highlighted');
                });
            });
        })
        .catch(function (error) {
            console.error('Error loading knowledge graph:', error);
        });
})();
