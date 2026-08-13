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
            color: '#FF4136',
            labels: ['Cybersecurity', 'Network Security', 'Application Security', 'ssh', 'TSL', 'X506', 'OPCUA']
        },
        languages: {
            name: 'Languages',
            color: '#FF9F1C',
            labels: ['Programming', 'JAVA', 'Python', 'Bash', 'YAML', 'C++', 'javascript', 'HTML', 'sql']
        },
        theory: {
            name: 'CS Theory',
            color: '#B388FF',
            labels: ['Data strcutures', 'Functions', 'Conditions', 'OOP', 'Recursive', 'Algorithms',
                'Dysktras Algorithm', 'Discrete Maths', 'Linear Algebra and Graph Theory']
        },
        aiData: {
            name: 'AI & Data',
            color: '#2EC4B6',
            labels: ['Machine Learning', 'NLP', 'Data Analysis', 'Audio and Speech processing',
                'Signal processing', 'databases', 'postgres', 'mongodb', 'Visulisation', 'GFX']
        },
        devops: {
            name: 'DevOps & Cloud',
            color: '#FF3D81',
            labels: ['Docker', 'K4s', 'AWS', 'Github Actions', 'Automation', 'Scripting', 'Virtual Machines',
                'Github', 'Git', 'Github Pages', 'Jira', 'Slack', 'Google Workspaces', 'Powershell', 'postman', 'APIS']
        },
        networking: {
            name: 'Networking & IoT',
            color: '#3D8BFD',
            labels: ['Networks', 'OSI network model', 'TCP', 'UDP', 'HTTP(S)', 'Radio communications', 'IoT',
                'Lwm2m', 'COAP', 'Microcontroller Programmimg', 'Mobile Information Devices', 'Rasberry Pi',
                'Arduino', 'PID controllers']
        },
        tools: {
            name: 'Tools',
            color: '#C9F24B',
            labels: ['VIM', 'IntelliJ', 'Maven', 'Spring', 'Matlab']
        },
        os: {
            name: 'Operating Systems',
            color: '#4CAF50',
            labels: ['linux', 'windows', 'macOS']
        }
    };

    var DEFAULT_CLUSTER = { name: 'Other', color: '#8a8580' };

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

    fetch('/data/graph.json')
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

            var hoverNode = null;
            var neighborIds = new Set();
            var highlightLinks = new Set();
            var FADE_COLOR = 'rgba(99,95,92,0.2)';
            var BASE_LINK_COLOR = 'rgba(155,149,145,0.25)';
            var HOT_LINK_COLOR = '#d81324';

            function linkEndpointId(end) {
                return typeof end === 'object' ? end.id : end;
            }

            function isHighlighted(node) {
                return node === hoverNode || neighborIds.has(node.id);
            }

            var hasSpriteText = typeof SpriteText !== 'undefined';

            var Graph = ForceGraph3D()(container)
                .width(container.clientWidth)
                .height(container.clientHeight)
                .graphData({ nodes: nodes, links: rawLinks })
                .backgroundColor('rgba(0,0,0,0)')
                .nodeId('id')
                .nodeVal('val')
                .nodeOpacity(0.92)
                .nodeLabel('label')
                .nodeRelSize(3.4)
                .nodeColor(function (node) {
                    return hoverNode && !isHighlighted(node) ? FADE_COLOR : node.color;
                })
                .linkColor(function (link) {
                    return highlightLinks.has(link) ? HOT_LINK_COLOR : BASE_LINK_COLOR;
                })
                .linkOpacity(0.35)
                .linkWidth(function (link) { return highlightLinks.has(link) ? 2 : 0.6; })
                .linkDirectionalParticles(function (link) { return highlightLinks.has(link) ? 2 : 0; })
                .linkDirectionalParticleWidth(1.6)
                .linkDirectionalParticleColor(function () { return HOT_LINK_COLOR; })
                .cooldownTime(Infinity)
                .onNodeHover(function (node) {
                    hoverNode = node || null;
                    neighborIds.clear();
                    highlightLinks.clear();
                    if (node) {
                        rawLinks.forEach(function (link) {
                            var srcId = linkEndpointId(link.source);
                            var tgtId = linkEndpointId(link.target);
                            if (srcId === node.id || tgtId === node.id) {
                                highlightLinks.add(link);
                                neighborIds.add(srcId);
                                neighborIds.add(tgtId);
                            }
                        });
                    }
                    container.style.cursor = node ? 'pointer' : 'grab';
                    Graph.nodeColor(Graph.nodeColor());
                    Graph.linkColor(Graph.linkColor());
                    Graph.linkWidth(Graph.linkWidth());
                    Graph.linkDirectionalParticles(Graph.linkDirectionalParticles());
                })
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

            if (hasSpriteText) {
                Graph.nodeThreeObjectExtend(true)
                    .nodeThreeObject(function (node) {
                        var sprite = new SpriteText(node.label);
                        sprite.color = 'rgba(236,231,226,0.95)';
                        sprite.textHeight = 2.4;
                        sprite.backgroundColor = false;
                        sprite.padding = 0;
                        sprite.visible = false;
                        return sprite;
                    });
            }

            function syncSize() {
                Graph.width(container.clientWidth).height(container.clientHeight);
            }

            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(syncSize).observe(container);
            } else {
                window.addEventListener('resize', syncSize);
            }

            /* Nodes roughly fill a 3D volume as the count grows, so scale distance by
               the cube root of node count rather than a size tuned to today's dataset.
               Starts pulled back further than the graph's natural scale so the full
               cluster is visible at a glance instead of opening on a dense close-up. */
            var initialCameraDistance = Math.max(160, Math.min(700, 85 * Math.cbrt(nodes.length)));
            Graph.cameraPosition({ x: 0, y: 0, z: initialCameraDistance }, undefined, 0);

            /* Keep the graph gently alive instead of settling into a static pose,
               and reveal node labels once the camera is close enough to read them. */
            if (Graph.controls) {
                var controls = Graph.controls();
                if (controls) {
                    if (!reduceMotion) {
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

                    if (hasSpriteText) {
                        /* Checked on an interval (not just camera 'change') since node
                           positions also drift on their own from the perpetual-motion nudge.
                           Reveal distance scales with each node's importance (val), so the
                           handful of highest-rank topics stay labeled even at the zoomed-out
                           starting view, while minor nodes only label up close - keeps the
                           graph legible without labeling all 70+ nodes at once. */
                        var LABEL_BASE_DISTANCE = 50;
                        var LABEL_VAL_SCALE = 45;
                        setInterval(function () {
                            var camPos = Graph.camera().position;
                            nodes.forEach(function (n) {
                                if (!n.__threeObj) return;
                                var dx = (n.x || 0) - camPos.x;
                                var dy = (n.y || 0) - camPos.y;
                                var dz = (n.z || 0) - camPos.z;
                                var threshold = LABEL_BASE_DISTANCE + n.val * LABEL_VAL_SCALE;
                                n.__threeObj.visible = Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold;
                            });
                        }, 400);
                    }
                }
            }

            if (!reduceMotion) {
                setInterval(function () {
                    nodes.forEach(function (n) {
                        n.vx = (n.vx || 0) + (Math.random() - 0.5) * 0.6;
                        n.vy = (n.vy || 0) + (Math.random() - 0.5) * 0.6;
                        n.vz = (n.vz || 0) + (Math.random() - 0.5) * 0.6;
                    });
                }, 2600);
            }
        })
        .catch(function (error) {
            console.error('Error loading knowledge graph:', error);
        });
})();
