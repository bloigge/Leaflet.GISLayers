# Leaflet.GISLayers
A leaflet layers control which enables drag and drop reordering and grouping of layers.

## Demo  
[Demo](https://bloigge.github.io/Leaflet.GISLayers/examples/index.html)

## Installation
  - L.control.gisLayers takes a config object. On the first level two arrays initialize the basemaps and overlays. 
  - A layer is an Object which has a data and name property. The value of the data property points to a Leaflet layer.
  - A group is an Object which has a data, a name and a grouped property. The value of the data property is an array which holds Leaflet layers and/or groups.

```sh
127.0.0.1:8000
```


## ToDos
  - Add dotted guidelines between groups and layers
  - Init each layer on a separate pane using a config flag (better zIndex handling for Tilelayer vs. Geojson/NonTilelayer)


## Author
[Bernd Loigge]

## License

----------------------------------------------------------------------------
"THE BEER-WARE LICENSE" (Revision 42):
[http://geo-service.at/]Bernd Loigge wrote this. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return Poul-Henning Kamp
----------------------------------------------------------------------------


[bernd loigge]<mailto:bernd.loigge@gmx.at>
