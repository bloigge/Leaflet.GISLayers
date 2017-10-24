
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        //AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        module.exports = factory(require('leaflet'));
    } else {
        // Browser globals
        if (typeof window.L === 'undefined')
            throw 'Leaflet must be loaded first';
        factory(window.L);
    }
})(function (L) {


    // L.Layer.addInitHook(function(){
    //     if (this.options)
    //     var uid = L.Util.stamp(this);
    //     console.log(this);
    //     L.Util.setOptions(this, {
    //         pane: 'pane_' + uid
    //     });
    // });

    // L.Map.include({
    //     addLayer: function (layer) {
    //         if (layer.options.singlePane) {
    //             var aPaneName = layer.options.paneName;
    //             var aPane = this.getPane(aPaneName) ? this.getPane(aPaneName) : this.createPane(aPaneName);
    //             aPane.style.zIndex = 300;
    //             layer.options.pane = aPaneName;
    //         }

    //         if (!layer._layerAdd) {
    //             throw new Error('The provided object is not a Layer.');
    //         }

    //         var id = L.Util.stamp(layer);
    //         if (this._layers[id]) { return this; }
    //         this._layers[id] = layer;
    
    //         layer._mapToAdd = this;
    
    //         if (layer.beforeAdd) {
    //             layer.beforeAdd(this);
    //         }

    //         this.whenReady(layer._layerAdd, layer);
    
    //         return this;
    //     }
    // });



    L.Control.GisLayers = L.Control.Layers.extend({
        options: {
            'collapsed': true,
            'groupSymbol': '<i class="fa fa-object-group" aria-hidden="true"></i> '
            // 'groupSymbol': '<span>GROUP: </span>'
            //'groupSymbol': ' '
        },


        initialize: function (baseLayers, overlays, options) {
            var self = this;
            L.Util.setOptions(this, options);

            if (this.options.geojsonEqual) {

            }

            this._layerControlInputs = [];
            this._layers = [];
            this._lastZIndex = 0;
            this._handlingClick = false;
            this._tree = window.aTree = this._createTree();
            this._iterateLayerJson({"data": baseLayers, "name": "Baselayers"}, "root");
            this._iterateLayerJson({"data": overlays, "name": "Overlays"}, "root", true);
        },

        _iterateLayerJson: function(json, relateTo, type) {
           
            // Loop Json
            for (var key in json) {
                if (key === "data") {
                    var value = json.data;
                    var name = json.name;
                    if (Object.prototype.toString.call( value ) === '[object Array]' && value !== null) {
                        var data = {
                            "name": name,
                            "overlay": type,
                            "isGroup": true,
                            "grouped": json.grouped
                        }
                        var aNode = this._tree.add(data, relateTo, this._tree.traverseBF);
                        for (var i in value) {
                            this._iterateLayerJson(value[i], aNode.id, type);
                        }
                        
                    } else {
                        var data = {
                            "name": name,
                            "layer": value,
                            "overlay": type
                        }
                        var aNode = this._tree.add(data, relateTo, this._tree.traverseBF);
                        this._addLayer(value, name, type);
                    }
                }
            }
        },

        _update: function () {
            var self = this;
            if (!this._container) { return this; }
    
            L.DomUtil.empty(this._baseLayersList);
            L.DomUtil.empty(this._overlaysList);
    
            this._layerControlInputs = [];
            var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;
    
            this._tree.traverseBF(function(node) {
                var obj = node.data;
                node.createElement();
                // overlaysPresent = overlaysPresent || obj.overlay;
                // baseLayersPresent = baseLayersPresent || !obj.overlay;
                // baseLayersCount += !obj.overlay ? 1 : 0;
            })
    
            // Hide base layers section if there's only one layer.
            if (this.options.hideSingleBase) {
                baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
                this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
            }
    
            this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
            this._tree.update();
            return this;
        },

        _createGuid: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        },    

        _initLayout: function () {

            var className = 'leaflet-control-layers',
                container = this._container = L.DomUtil.create('div', className),
                collapsed = this.options.collapsed;
    
            // makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
            container.setAttribute('aria-haspopup', true);
    
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
    
            var form = this._form = L.DomUtil.create('form', className + '-list');
    
            if (collapsed) {
                this._map.on('click', this.collapse, this);
    
                if (!L.Browser.android) {
                    L.DomEvent.on(container, {
                        mouseenter: this.expand,
                        mouseleave: this.collapse
                    }, this);
                }
            }
    
            var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
            link.href = '#';
            link.title = 'Layers';
    
            if (L.Browser.touch) {
                L.DomEvent
                    .on(link, 'click', stop)
                    .on(link, 'click', this.expand, this);
            } else {
                L.DomEvent.on(link, 'focus', this.expand, this);
            }
    
            if (!collapsed) {
                this.expand();
            }
    
            this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
            this._separator = L.DomUtil.create('div', className + '-separator', form);
            this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);
    
            container.appendChild(form);
        },

        _createTree: function () {
            var self = this;

            (function Node(self) {
                var Node = function(data, id, tree) {
                    return new Node.init(data, id, tree);
                };

                Node.prototype = {

                    isLayer: function() {
                        return (this.data.name && this.data.layer) ? true : false;
                    },
                    
                    isRoot: function() {
                        return this.data.name === 'root'
                    },
    
                    isOverlayGroup: function() {
                        return (this.data.name === 'Overlays') ? true : false;
                    },
    
                    isBaseLayerGroup: function() {
                        return (this.data.name === 'Baselayers') ? true : false;
                    },
    
                    layerIsBaseLayer: function() {
                        return this.parent.isBaseLayerGroup();
                    },
    
                    isGroup: function() {
                        return this.data.hasOwnProperty("isGroup")
                    },

                    addLayerToMap:function() {

                        var layer = this.data.layer
                        var id = L.Util.stamp(layer)
                        var map = self._map;
                        if (map._layers[id]) { return map; }
                        map._layers[id] = layer;
                
                        layer._mapToAdd = map;
                
                        if (layer.beforeAdd) {
                            layer.beforeAdd(map);
                        }
                
                        map.whenReady(function (e) {
                            var map = e.target;
                            // check in case layer gets added and then removed before the map is ready
                            if (!map.hasLayer(this)) { return; }
                    
                            this._map = map;
                            this._zoomAnimated = map._zoomAnimated;
                    
                            if (this.getEvents) {
                                var events = this.getEvents();
                                map.on(events, this);
                                this.once('remove', function () {
                                    map.off(events, this);
                                }, this);
                            }
                    
                            this.onAdd(map);
                    
                            if (this.getAttribution && map.attributionControl) {
                                map.attributionControl.addAttribution(this.getAttribution());
                            }
                        }, layer);
                
                        return this;
                    },
                    
                    removeLayerFromMap: function() {
                        var layer = this.data.layer;
                        var id = L.Util.stamp(layer);
                        var map = self._map;
                        if (!map._layers[id]) { return this; }
                
                        if (map._loaded) {
                            layer.onRemove(map);
                        }
                
                        if (layer.getAttribution && map.attributionControl) {
                            map.attributionControl.removeAttribution(layer.getAttribution());
                        }
                
                        delete map._layers[id];
                
                        layer._map = layer._mapToAdd = null;
                
                        return map;
                    },
                    
                    getDepth: function() {
                        var i = -1;
                        var aParent = this.parent;
                        while (aParent !== null) {
                            aParent = aParent.parent;
                            i++;
                        }
                        return i
                    },
    
                    createElement: function() {
                        if (!this.isRoot()) {
                            if (this.isBaseLayerGroup()) {
                                this.domRef = self._baseLayersList;
                            } else if (this.isOverlayGroup()) {
                                this.domRef = self._overlaysList;
                            } else {
                                if (this.isGroup()) {
                                    this.createGroupElement(this.parent.domRef);
                                } else {
                                    if (this.data.overlay) {
                                        this.createLayerElement(this.parent.domRef);
                                    } else {
                                        this.createBaseMapElement(this.parent.domRef);
                                    }
                                }
                            }
                        }
                    },
    
                    createWrapperElement: function() {

                        var wrapper = document.createElement('div');
                        if (this.isGroup()) {
                            wrapper.className += ' leaflet-gislayers-group';
                        } else {
                            wrapper.className += (this.layerIsBaseLayer()) ? ' leaflet-gislayers-baselayer' :' leaflet-gislayers-layer';                        
                        }

                        // Create Guidelines For Togglebox
                        // var guidelineCanvas = document.createElement("canvas");
                        // guidelineCanvas.className += 'leaflet-gislayers-guidelines';
                        // wrapper.appendChild(guidelineCanvas);

                        return wrapper
                    },                    

                    createHiddenElement: function() {
                        var div = document.createElement('div');
                        div.style.height  = '2px';
                        div.classList += 'hidden-line';
                        div.ondragover = this.onNodeDragOver.bind(this);
                        div.ondragleave = this.onNodeDragLeave.bind(this);
                        div.ondrop = this.onNodeDrop.bind(this);
                        return div
                    },

                    createHolderElement: function() {
                        // Create Holder
                        var holder = document.createElement('div');
                        holder.id = this.id;
                        holder.className += ' gislayer-node';
                        holder.setAttribute('draggable', true);
                        holder.ondrop = this.onNodeDrop.bind(this);
                        holder.ondragover = this.onNodeDragOver.bind(this);
                        holder.ondragleave = this.onNodeDragLeave.bind(this);
                        holder.ondragstart = this.onDragStart.bind(this);

                        return holder
                    },

                    onHideClick: function(ev) {
                        console.log(this)
                        this.data.grouped = this.data.grouped ? false: true;
                        self._tree.update();
                    },

                    onNodeDrop: function(ev) {
                        ev.preventDefault();
                        var id = ev.dataTransfer.types[0];
                        var aNode = self._tree.getNodeById(id);
                        if (this.isDroppable(aNode, ev)) {
                            this.resetOnHoverStyle(ev);
                            if (this.isHiddenLine(ev)) {
                                var aParent = this.moveNode.call(this.parent, aNode);
                                aParent.children.splice(aParent.children.indexOf(this), 0, aParent.children.splice(aParent.children.indexOf(aNode), 1)[0]);
                                self._update();
                            } else {
                                this.moveNode.call(this, aNode);
                                self._update();
                            }
                        } else {
                            ev.dataTransfer.dropEffect = "none";
                        }
                    },

                    onNodeDragOver: function(ev) {
                        ev.preventDefault();
                        var id = ev.dataTransfer.types[0];
                        var aNode = self._tree.getNodeById(id);
                        if (this.isDroppable(aNode, ev)) {
                            this.setOnHoverStyle(ev);
                        } else {
                            ev.dataTransfer.dropEffect = "none";
                        }
                    },

                    onNodeDragLeave: function(ev) {
                        ev.preventDefault();
                        this.resetOnHoverStyle(ev);
                    },

                    onDragStart: function(ev) {
                        ev.dataTransfer.setData(this.id, '');
                    },

                    createNameElement: function(innerHTML, id) {
                        var name = document.createElement('label');
                        name.style = "display: inline"; 
                        name.htmlFor = this.getInputBoxId();
                        name.innerHTML = innerHTML;                        
                        return name
                    },

                    createBaseMapElement: function(ref) {
                        var obj = this.data;
                        var wrapper = this.createWrapperElement();
                        var holder = document.createElement('div');
                        holder.id = this.id;
                        holder.className += ' gislayer-node';
                        input = self._createRadioElement('leaflet-base-layers input-box', self._map.hasLayer(obj.layer));
                        input.layerId = L.Util.stamp(obj.layer);
                        input.id = this.getInputBoxId();
                        self._layerControlInputs.push(input);
                        L.DomEvent.on(input, 'click', self._onInputClick, self);

                        // Create Name
                        var name = this.createNameElement(' ' + obj.name);
                        return this.createNodeElement(holder, null, wrapper, input, name, ref);            
                    },

                    createLayerElement: function(ref) {
                        var obj = this.data;
                        var wrapper = this.createWrapperElement();
                        var holder = this.createHolderElement();
                        var hidden = this.createHiddenElement();

                        // Create Input
                        var input = document.createElement('input');
                        input.type = 'checkbox';
                        input.classList += 'node-checkbox';
                        input.className = 'leaflet-control-layers-selector tree-guide input-box';
                        input.defaultChecked = self._map.hasLayer(obj.layer);
                        input.layerId = L.Util.stamp(obj.layer);
                        input.id = this.getInputBoxId();
                        self._layerControlInputs.push(input);
                        L.DomEvent.on(input, 'click', self._onInputClick, self);
                        L.DomEvent.on(input, 'click', this.layerClick, this);
                        L.DomEvent.on(input, 'click', this.tree.updateZIndex, this.tree);
            
                        // Create Name
                        var name = this.createNameElement(' ' + obj.name);
                        
                        // Create Final DOM Element
                        return this.createNodeElement(holder, hidden, wrapper, input, name, ref);    
                    },

                    createGroupElement: function(ref) {
                        var obj = this.data;
                        var wrapper = this.createWrapperElement();
                        var holder = this.createHolderElement();
                        var hidden = this.createHiddenElement();

                        // Create GroupInput
                        var groupinput = document.createElement('input');
                        groupinput.className = 'leaflet-control-layers-selector grouping-box';
                        groupinput.type = 'checkbox';


                        // Create Input
                        var input = document.createElement('input');
                        input.type = 'checkbox';
                        input.id = this.getInputBoxId();
                        input.className = 'leaflet-control-layers-selector tree-guide input-box';
                        L.DomEvent.on(input, 'click', this.groupClick, this);

                        // Create Name
                        var name = this.createNameElement(self.options.groupSymbol + obj.name);

                        // Create Toggle Mode Button
                        var toggleButton = document.createElement('input');
                        toggleButton.type = 'checkbox';
                        toggleButton.id = this.getToggleBoxId();
                        toggleButton.className = 'leaflet-control-layers-selector leaflet-gislayers-toggle-box toggle-box';
                        toggleButton.onclick = this.onHideClick.bind(this);
                        var toggleButtonLabel = document.createElement('label');
                        toggleButtonLabel.htmlFor = this.getToggleBoxId();

                        holder.appendChild(toggleButton);
                        holder.appendChild(toggleButtonLabel);


                        // Create Final DOM Element
                        return this.createNodeElement(holder, hidden, wrapper, input, name, ref); 
                    },

                    createNodeElement: function(holder, hidden, wrapper, input, name, ref, groupinput) {
                        var outer = document.createElement("div");

                        if (groupinput) {
                            holder.appendChild(groupinput);
                        }
                        holder.appendChild(input);
                        holder.appendChild(name);
                        if (hidden) {
                            wrapper.appendChild(hidden);
                        }                        
                        wrapper.appendChild(holder);
                        ref.appendChild(wrapper);
                        
                        this.domRef = wrapper;

                        return wrapper
                    },

                    groupClick: function(ev) {
                        var status = this.getState();
                        var groupNodes = this.tree.getGroupElements(this);
                        for (var a in groupNodes) {
                            var aNode = groupNodes[a];
                            if (this !== aNode) {
                                if (aNode.isLayer()) {
                                    if (status !== true) {
                                        aNode.removeLayerFromMap();
                                    } else {
                                        aNode.addLayerToMap();
                                    }
                                }                     
                            }
                        };
                        for (var a in groupNodes) {
                            var aNode = groupNodes[a];
                            aNode.getInputBox().checked = status;
                        }

                        this.getInputBox().checked = status;
                        this.tree.updateGroupStates();
                    },

                    layerClick: function(ev) {
                        this.tree.updateGroupStates();
                    },

                    setGroupState: function(state) {
                        if (this.isGroup()) {
                            this.getInputBox().checked = state
                        }
                        if (state === 'indeterminate') {
                            this.getInputBox().indeterminate = true
                        } else {
                            this.getInputBox().indeterminate = false
                        }
                    },

                    calculateGroupState: function(group) {
                        var aGroup = group || this;
                        if (aGroup.isGroup()) {
                            var groupElements = aGroup.getGroupElementsWithoutSelf();
                            var count = 0;
                            for (var a in groupElements) {
                                var el = groupElements[a];
                                if (el.getState() === true) {
                                    count++
                                }
                            }
                            if (groupElements.length === 0) {
                                return this.getState()
                            }

                            if (count === groupElements.length) {
                                return true
                            }

                            if (count === 0) {
                                return false
                            }

                            return 'indeterminate'
                        }
                    },

                    getNodeHoverColor: function() {
                        return '#cccccc';
                    },

                    getInputBox: function() {
                        return this.domRef.getElementsByClassName("input-box")[0];
                    },

                    getToggleBox: function() {
                        return this.domRef.getElementsByClassName("toggle-box")[0];
                    },

                    getInputBoxId: function() {
                        return this.id + '_selectorbox';
                    },

                    getToggleBoxId: function() {
                        return this.id + '_togglebox';
                    },

                    getState: function() {
                        return this.getInputBox().checked;
                    },
    
                    getParent: function() {
                        return this.parent
                    },

                    getName: function() {
                        return this.isGroup() ? this.data.name : this.data.name
                    },

                    getLeafletLayer: function() {
                        return this.isLayer() ? this.data.layer : null
                    },

                    getGroupElementsWithoutSelf: function(sNode) {
                        var selectedNode = sNode || this;
                        var result = this.tree.getGroupElements(selectedNode);
                        result.splice(0,1);
                        return result
                    },

                    resetOnHoverStyle: function(ev) {
                        var elem;
                        if (this.isHiddenLine(ev)) {
                            elem = ev.target;
                        } else {
                            elem = this.domRef.children[1];
                        }
                        elem.style.backgroundColor = "";
                    },

                    setOnHoverStyle: function(ev) {
                        var elem;
                        if (this.isHiddenLine(ev)) {
                            elem = ev.target;
                        } else {
                            elem = this.domRef.children[1];
                        }
                        elem.style.backgroundColor = this.getNodeHoverColor();                        
                    },

                    isHiddenLine: function(ev) {
                        return ev.target.classList.contains('hidden-line') 
                    },

                    isDroppable: function(dragingNode, ev) {
                        if (dragingNode === this) {
                            return false
                        }
                        
                        if (dragingNode.isGroup()) {
                            if (this.tree.checkIfIsChild(dragingNode, this)) {
                                return false
                            } else {
                                return true
                            }
                        }
                        
                        if (this.isHiddenLine(ev)) {
                            return true
                        }
                        
                        if (this.isLayer()) {
                            return false
                        }


                        return true
                    },
                    
                    moveNode: function(aNode) {
                        var aParent = this;
                        var aParentId = aParent.id;
                        var oldNodeParentId = aNode.parent.id;
                        var oldParent = this.tree.getNodeById(oldNodeParentId);
                        oldParent.children.splice(oldParent.children.indexOf(aNode), 1);
                        this.tree.add(aNode, aParentId, this.tree.traverseDF);
                        return this
                    }                    
                };

                Node.init = function(data, id, tree) {
                    this.data = data;
                    this.id = id;
                    this.tree = tree;
                    this.parent = null;
                    this.children = [];
                    this.domRef;
                };

                Node.init.prototype = Node.prototype;

                self.Node = Node;
                
            }(self));

            (function Queue(self) {
                var Queue = function() {
                    return new Queue.init();
                };

                Queue.prototype = {
                    size: function () {
                        return this._newestIndex - this._oldestIndex;
                    },
    
                    enqueue: function (data) {
                        this._storage[this._newestIndex] = data;
                        this._newestIndex++;
                    },
    
                    dequeue: function () {
                        var oldestIndex = this._oldestIndex,
                            newestIndex = this._newestIndex,
                            deletedData;
    
                        if (oldestIndex !== newestIndex) {
                            deletedData = this._storage[oldestIndex];
                            delete this._storage[oldestIndex];
                            this._oldestIndex++;
    
                            return deletedData;
                        }
                    }
                };

                Queue.init = function() {
                    this._oldestIndex = 1;
                    this._newestIndex = 1;
                    this._storage = {};
                };

                Queue.init.prototype = Queue.prototype;

                self.Queue = Queue;

            }(self));

            (function Tree(self) {
                var Tree = function(data) {
                    return new Tree.init(data);
                };

                Tree.prototype = {

                    getOverlays: function() {
                        return this._root.children[1];
                    },

                    getBasemaps: function() {
                        return this._root.children[0];
                    },

                    getNodeById: function(id) {
                        var self = this;
                        return (function() {
                            var myNode;
                            self.traverseDFforGroup(self.getOverlays(), function(aNode) {
                                if (aNode.id === id) {
                                    myNode = aNode
                                }
                            });
                            return myNode
                        }())
                    },

                    update: function() {
                        this.updateGroupStates();
                        this.updateToggleState();
                        this.updateZIndex();
                    },

                    updateGroupStates: function() {
                        this.traverseDFforGroup(this.getOverlays(), function(aNode) {
                            if (!aNode.isOverlayGroup() && !aNode.isBaseLayerGroup() && aNode.isGroup()) {
                                aNode.setGroupState(aNode.calculateGroupState());
                            }
                        })
                    },

                    updateToggleState: function() {
                        this.traverseDFforGroup(this.getOverlays(), function(aNode) {
                            if (!aNode.isOverlayGroup() && !aNode.isBaseLayerGroup() && aNode.isGroup()) {
                                // Check toggleBox
                                aNode.getToggleBox().checked = aNode.data.grouped;
                                var state = aNode.data.grouped ? 'none' : '';
                                var childNodes = aNode.domRef.childNodes;
                                for (var i = 2;  i < childNodes.length; i++) {
                                    var a = childNodes[i];
                                    a.style.display = state;
                                }
                            }
                        })
                    },

                    updateZIndex: function() {
                        // Overlays in Order
                        var overlays = this.getGroupLayerDF(this.getOverlays()).reverse();
                        for (var i in overlays) {
                            var zIndex = parseFloat(i) + 1;
                            var aLayer = overlays[i];
                            var leafletLayer = aLayer.getLeafletLayer()
                            if (self._map.hasLayer(leafletLayer)) {
                                leafletLayer.bringToFront();
                            }
                        }
                    },

                    getZIndexOfElement: function (e) {      
                        var z = window.document.defaultView.getComputedStyle(e).getPropertyValue('z-index');
                        if (isNaN(z)) return window.getZIndex(e.parentNode);
                        return z; 
                    },

                    checkIfIsChild: function(selectedNode, toBeChecked) {
                        var group = this.getGroupElements(selectedNode);
                        var isInGroup = false;
                        for (var i in group) {
                            if (toBeChecked === group[i]) {
                                isInGroup = true;
                                break;
                            }
                        }
                        return isInGroup
                    },

                    generateJson: function(selectedNode, json) {
                        return (function loopChildren(currentNode, obj) {
                            var children = currentNode.children;
                            for (var i in children) {
                                var aNode = children[i];
                                if (aNode.isGroup()) {
                                    var newGroup = [];
                                    var aNewObj = {
                                        "data": newGroup,
                                        "name": aNode.data.name,
                                        "grouped": aNode.data.grouped
                                    };
                                    obj.push(aNewObj)                                  
                                    loopChildren(aNode, newGroup);
                                } else {
                                    obj.push({
                                        "data": aNode.data.layer,
                                        "name": aNode.data.name,
                                    })
                                }
                            }
                            return obj
                        }(selectedNode, json))
                    },

                    getGroupElements: function(selectedNode) {
                        var self = this;
                        var group = selectedNode.isGroup() ? selectedNode : selectedNode.parent;
                        return (function() {
                            var layer = [];
                            self.traverseBFForGroup(group, function(aNode) {
                                if (!aNode.parent.isRoot()) {
                                    layer.push(aNode);
                                }
                            });
                            return layer
                        }());
                    },

                    getGroupElementsDF: function(selectedNode) {
                        var self = this;
                        var group = selectedNode.isGroup() ? selectedNode : selectedNode.parent;
                        return (function() {
                            var layer = [];
                            self.traverseDFforGroup(group, function(aNode) {
                                if (!aNode.parent.isRoot()) {
                                    layer.push(aNode);
                                }
                            });
                            return layer
                        }());
                    },                    

                    getGroupLayerDF: function(selectedNode) {
                        var nodes = this.getGroupElementsDF(selectedNode);
                        var groupLayers = [];
                        for (var a in nodes) {
                            var aNode = nodes[a];
                            if (aNode.isLayer()) {
                                groupLayers.push(aNode);
                            }
                        }
                        return groupLayers
                    },                     

                    getStructure: function() {
                        var self = this;
                        var template = {};
                        return  (function() {
                            var layer = {};
                            self.traverseBF(function(aNode) {
                                if (!aNode.isRoot()) {
                                    layer.push(aNode);
                                }
                            });
                            return layer
                        }());
                    },

                    traverseDF: function (callback) {
                        // this is a recurse and immediately-invoking function 
                        (function recurse(currentNode) {
                            // step 2
                            for (var i = 0, length = currentNode.children.length; i < length; i++) {
                                // step 3
                                recurse(currentNode.children[i]);
                            }

                            // step 4
                            callback(currentNode);

                            // step 1
                        })(this._root);

                    },

                    traverseDFforGroup: function (entryPoint, callback) {
                        // this is a recurse and immediately-invoking function 
                        (function recurse(currentNode) {
                            // step 2
                            for (var i = 0, length = currentNode.children.length; i < length; i++) {
                                // step 3
                                recurse(currentNode.children[i]);
                            }

                            // step 4
                            callback(currentNode);

                            // step 1
                        })(entryPoint);

                    },

                    traverseBFForGroup: function (entryPoint, callback) {
                        var queue = self.Queue();

                        queue.enqueue(entryPoint);

                        currentTree = queue.dequeue();

                        while (currentTree) {
                            for (var i = 0, length = currentTree.children.length; i < length; i++) {
                                queue.enqueue(currentTree.children[i]);
                            }

                            callback(currentTree);
                            currentTree = queue.dequeue();
                        }
                    },

                    traverseBF: function (callback) {
                        var queue = self.Queue();

                        queue.enqueue(this._root);

                        currentTree = queue.dequeue();

                        while (currentTree) {
                            for (var i = 0, length = currentTree.children.length; i < length; i++) {
                                queue.enqueue(currentTree.children[i]);
                            }

                            callback(currentTree);
                            currentTree = queue.dequeue();
                        }
                    },

                    contains: function (callback, traversal) {
                        traversal.call(this, callback);
                    },

                    add: function (data, toData, traversal) {
                        var child = (data instanceof self.Node) ? data : self.Node(data, this.createUniqueID(), this);
                        var parent = null,
                            callback = function (node) {
                                if (node.id === toData) {
                                    parent = node;
                                }
                            };

                        this.contains(callback, traversal);
                        if (parent) {
                            parent.children.push(child);
                            child.parent = parent;
                        } else {
                            throw new Error('Cannot add node to a non-existent parent.');
                        }
                        return child
                    },

                    remove: function (data, fromData, traversal) {
                        var tree = this,
                            parent = null,
                            childToRemove = null,
                            index;

                        var callback = function (node) {
                            if (node.id === fromData) {
                                parent = node;
                            }
                        };

                        this.contains(callback, traversal);

                        if (parent) {
                            index = this.findIndex(parent.children, data);

                            if (index === undefined) {
                                throw new Error('Node to remove does not exist.');
                            } else {
                                childToRemove = parent.children.splice(index, 1);
                            }
                        } else {
                            throw new Error('Parent does not exist.');
                        }

                        return childToRemove;
                    },

                    findIndex: function (arr, data) {
                        var index;

                        for (var i = 0; i < arr.length; i++) {
                            if (arr[i].data === data) {
                                index = i;
                            }
                        }

                        return index;
                    },

                    createUniqueID: function () {
                        function s4() {
                            return Math.floor((1 + Math.random()) * 0x10000)
                                .toString(16)
                                .substring(1);
                        }
                        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                            s4() + '-' + s4() + s4() + s4();
                    }
                }

                Tree.init = function(data) {
                    var node = self.Node(data, "root", this);
                    this._root = node;
                }

                Tree.init.prototype = Tree.prototype;
                
                self.Tree = Tree;                
                
            }(self));

            return self.Tree(
                {
                    name: 'root'
                }
            )

        },       

        _addLayer: function (layer, name, overlay) {
            
            if (this._map) {
                layer.on('add remove', this._onLayerChange, this);
            }
            myLayer = layer;
            this._layers.push({
                layer: layer,
                name: name,
                overlay: overlay
            });
    
            if (this.options.sortLayers) {
                this._layers.sort(bind(function (a, b) {
                    return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
                }, this));
            }
    
            if (this.options.autoZIndex && layer.setZIndex) {
                this._lastZIndex++;
                layer.setZIndex(this._lastZIndex);
            }
    
            this._expandIfNotCollapsed();
        },

        _addBasemapLayer: function (layer, name, overlay) {
            if (this._map) {
                layer.on('add remove', this._onLayerChange, this);
            }
    
            this._layers.push({
                layer: layer,
                name: name,
                overlay: overlay
            });
    
            if (this.options.sortLayers) {
                this._layers.sort(bind(function (a, b) {
                    return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
                }, this));
            }
    
            if (this.options.autoZIndex && layer.setZIndex) {
                this._lastZIndex++;
                layer.setZIndex(this._lastZIndex);
            }
    
            this._expandIfNotCollapsed();
        }      

    });


    L.control.gisLayers = function (baseLayers, overlays, options) {
        return new L.Control.GisLayers(baseLayers, overlays, options);
    };

    return L.Control.GisLayers;

});
