(function () {
    'use strict';

    var container = document.getElementById('cy');
    if (!container || typeof ForceGraph3D === 'undefined') return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Topics have no category field in the source data, so domains are assigned
       here by label. Keep this in sync with docs/data/topics.json if it grows. */
    var CLUSTERS = {
        security: {
            name: 'Security',
            color: '#B3000B',
            labels: ['Cybersecurity', 'Network Security', 'Application Security', 'ssh', 'TSL', 'X506', 'OPCUA']
        },
        languages: {
            name: 'Languages',
            color: '#E0A458',
            labels: ['Programming', 'JAVA', 'Python', 'Bash', 'YAML', 'C++', 'javascript', 'HTML', 'sql']
        },
        theory: {
            name: 'CS Theory',
            color: '#8A8FBF',
            labels: ['Data strcutures', 'Functions', 'Conditions', 'OOP', 'Recursive', 'Algorithms',
                'Dysktras Algorithm', 'Discrete Maths', 'Linear Algebra and Graph Theory']
        },
        aiData: {
            name: 'AI & Data',
            color: '#4FB0A5',
            labels: ['Machine Learning', 'NLP', 'Data Analysis', 'Audio and Speech processing',
                'Signal processing', 'databases', 'postgres', 'mongodb', 'Visulisation', 'GFX']
        },
        devops: {
            name: 'DevOps & Cloud',
            color: '#D9739F',
            labels: ['Docker', 'K4s', 'AWS', 'Github Actions', 'Automation', 'Scripting', 'Virtual Machines',
                'Github', 'Git', 'Github Pages', 'Jira', 'Slack', 'Google Workspaces', 'Powershell', 'postman', 'APIS']
        },
        networking: {
            name: 'Networking & IoT',
            color: '#6FA8DC',
            labels: ['Networks', 'OSI network model', 'TCP', 'UDP', 'HTTP(S)', 'Radio communications', 'IoT',
                'Lwm2m', 'COAP', 'Microcontroller Programmimg', 'Mobile Information Devices', 'Rasberry Pi',
                'Arduino', 'PID controllers']
        },
        tools: {
            name: 'Tools',
            color: '#C9C9C9',
            labels: ['VIM', 'IntelliJ', 'Maven', 'Spring', 'Matlab']
        },
        os: {
            name: 'Operating Systems',
            color: '#8C6E54',
            labels: ['linux', 'windows', 'macOS']
        }
    };

    var DEFAULT_CLUSTER = { name: 'Other', color: '#635f5c' };

    var labelToCluster = {};
    Object.keys(CLUSTERS).forEach(function (key) {
        CLUSTERS[key].labels.forEach(function (label) {
            labelToCluster[label] = key;
        });
    });

    function clusterFor(label) {
        return CLUSTERS[labelToCluster[label]] || DEFAULT_CLUSTER;
    }

    var infoEl = document.getElementById('graphInfo');
    var legendEl = document.getElementById('graphLegend');
    var fallbackListEl = document.getElementById('graphFallbackList');

    function renderLegend() {
        if (!legendEl) return;
        Object.keys(CLUSTERS).forEach(function (key) {
            var c = CLUSTERS[key];
            var item = document.createElement('span');
            item.className = 'graph-legend-item';
            item.innerHTML = '<span class="graph-legend-dot" style="background:' + c.color + '"></span>' + c.name;
            legendEl.appendChild(item);
        });
    }

    function showInfo(node) {
        if (!infoEl) return;
        var cluster = clusterFor(node.label);
        infoEl.innerHTML =
            '<span class="graph-info-cluster" style="color:' + cluster.color + '">' + cluster.name + '</span>' +
            '<h4 class="graph-info-title">' + node.label + '</h4>' +
            '<p class="graph-info-desc">' + node.desc + '</p>';
    }

    fetch('./data/graph.json')
        .then(function (response) {
            if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
            return response.json();
        })
        .then(function (jsonData) {
            var rawNodes = jsonData.elements.nodes.map(function (n) { return n.data; });
            var rawLinks = jsonData.elements.edges.map(function (e) { return e.data; });

            var nodes = rawNodes.map(function (n) {
                var cluster = clusterFor(n.label);
                return {
                    id: n.id,
                    label: n.label,
                    desc: n.desc,
                    size: n.size,
                    val: 1.4 + n.size * 0.7,
                    color: cluster.color
                };
            });

            renderLegend();
            if (fallbackListEl) {
                fallbackListEl.innerHTML = nodes.map(function (n) {
                    return '<li>' + n.label + ': ' + n.desc + '</li>';
                }).join('');
            }

            var Graph = ForceGraph3D()(container)
                .width(container.clientWidth)
                .height(container.clientHeight)
                .graphData({ nodes: nodes, links: rawLinks })
                .backgroundColor('rgba(0,0,0,0)')
                .nodeId('id')
                .nodeVal('val')
                .nodeColor('color')
                .nodeOpacity(0.92)
                .nodeLabel('label')
                .nodeRelSize(3)
                .linkColor(function () { return 'rgba(155,149,145,0.25)'; })
                .linkOpacity(0.35)
                .linkWidth(0.6)
                .onNodeClick(function (node) {
                    showInfo(node);
                    var distance = 90;
                    var ratio = 1 + distance / Math.hypot(node.x, node.y, node.z || 1);
                    Graph.cameraPosition(
                        { x: node.x * ratio, y: node.y * ratio, z: (node.z || 1) * ratio },
                        node,
                        900
                    );
                })
                .onBackgroundClick(function () {
                    if (infoEl) {
                        infoEl.innerHTML = '<p class="graph-info-placeholder">Select a node to see what it is.</p>';
                    }
                });

            window.addEventListener('resize', function () {
                Graph.width(container.clientWidth).height(container.clientHeight);
            });

            if (Graph.controls) {
                var controls = Graph.controls();
                if (controls && !reduceMotion) {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 0.6;
                    var resumeTimer = null;
                    controls.addEventListener('start', function () {
                        controls.autoRotate = false;
                        if (resumeTimer) clearTimeout(resumeTimer);
                    });
                    controls.addEventListener('end', function () {
                        resumeTimer = setTimeout(function () { controls.autoRotate = true; }, 4000);
                    });
                }
            }
        })
        .catch(function (error) {
            console.error('Error loading knowledge graph:', error);
        });
})();
