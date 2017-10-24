# Leaflet.GISLayers
A leaflet layers control which enables drag and drop reordering and grouping of layers.

## Demo  
[Demo](https://bloigge.github.io/Leaflet.GISLayers/examples/index.html)

## Configuration
  - L.control.gisLayers takes a config object. On the first level two arrays initialize the basemaps and overlays. 
  - A layer is an Object which has a data and name property. 
  - A group is an Object which has a data, a name and a grouped property. 

## ToDos
  - Add dotted guidelines between groups and layers
  - Init each layer on a separate pane using a config flag (better zIndex handling for Tilelayer vs. Geojson/NonTilelayer)


## Author
Bernd Loigge 

## License
