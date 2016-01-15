/** @jsx React.DOM */
var React = require('react');
var VRPlayer = require('./views/VRPlayer.js');

var App = React.createClass({
	getInitialState: function() {

		return { url: "../360videos/MythBusters+-+Sharks+Everywhere!+(360+Video)-3WIS6N_9gjA.mp4" };
	},
	render: function() {
		return (
			<VRPlayer url={this.state.url}></VRPlayer>
		);
	}
	
});
	
module.exports = App;
