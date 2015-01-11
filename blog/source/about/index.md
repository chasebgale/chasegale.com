title: about
date: 2015-01-08 11:17:43
---
{% rawblock %}

	<script type="text/javascript" src="index/moment.min.js"></script>
	<script type="text/javascript" src="index/moment-duration-format.js"></script>
	
	<script type="text/javascript">
	
		

		document.addEventListener('DOMContentLoaded', function(event) {
		
			var then = "2001-01-01";
			 
			var ms = moment().diff(moment(then));
			var d = moment.duration(ms);
		
			var formatted = moment.duration(d, "milliseconds").format("y [years], M [months and] d [days]");
			
			function recurseDOM(scope) {
		
				var i = 0, nodes, node;
				if(scope.childNodes)
				{
					nodes = scope.childNodes;
					for(i;i<nodes.length;i++)
					{
						node = nodes[i];
						if(node.nodeType === 3)
						{
							//is a text node
							checkTextNode(node);    
						}
						if(node.childNodes)
						{
							//loop through child nodes if child nodes are found
							recurseDOM(node);
						}
						node = null;
					}
					nodes = null;
				}   
			}

			function checkTextNode(node) {
			
				var patt = /brraaaiinnssss/g, text = node.data, test = patt.test(text);
				if(test)
				{
					//match found, replace node's textual data with specified string
					node.data = text.replace(patt, formatted);
					text = null;
				}
				test = null;
			}
			
			recurseDOM(document.body);
		});
	</script>

	<div id="about">
{% endrawblock /%}

![glorious leader](index/cbg.jpg "Darth Chase Brandon Gale")

#### CHASE BRANDON GALE

Passionate software developer at heart, operating under multiple revolving silly titles, most often **Senior Software Engineer** at the office and **Founder** after. Currently rocking brraaaiinnssss of experience designing, building, testing and deploying *awesome* applications.

##### WORK

{% rawblock %}
	</div>
{% endrawblock /%}