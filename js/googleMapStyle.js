var styles = [
	{
		featureType: 'landscape',
		elementType: 'geometry',
		stylers: [
			{ hue: '#dddddd' },
			{ saturation: -100 },
			{ lightness: -3 },
			{ visibility: 'simplified' }
		]
	},{
		featureType: 'water',
		elementType: 'all',
		stylers: [

		]
	}
];
var options = {
	mapTypeControlOptions: {
		mapTypeIds: [ 'Styled']
	},
	center: new google.maps.LatLng(41.855278780673224, -87.6253922820091),
	zoom: 18,
	mapTypeId: 'Styled'
};
var div = document.getElementById('map');
var map = new google.maps.Map(div, options);
var styledMapType = new google.maps.StyledMapType(styles, { name: 'Styled' });
map.mapTypes.set('Styled', styledMapType);