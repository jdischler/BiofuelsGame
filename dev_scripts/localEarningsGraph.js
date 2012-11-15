goog.provide('biofuelsGame.localEarningsGraph');

goog.require('lime.RoundedRect');
goog.require('lime.animation.FadeTo');
goog.require('lime.animation.ScaleTo');
goog.require('lime.fill.Stroke');
goog.require('lime.Polygon');
goog.require('lime.Label');

// TEMP: just to get some data to graph
//--------------------------------------------------------------------------------------------------
function bakeFakeEarningsData(yearCount, farmerCount)
{
	var minDollars = 20000;
	var maxDollars = 80000;
	var years = new Array(yearCount);
	
	for (var yr = 0; yr < yearCount; yr++)
	{
		years[yr] = new Array(farmerCount);
	}
	
	for (var idx = 0; idx < farmerCount; idx++)
	{
		var farmerBase = Math.random() * (maxDollars - minDollars) + minDollars
		for (var yr = 0; yr < yearCount; yr++)
		{
			years[yr][idx] = farmerBase;
			farmerBase += (Math.random() * (15000 - -9000) + -9000);
			if (farmerBase <= 1000) farmerBase = 1000;
		}
	}
	
	return years;
}

//--------------------------------------------------------------------------------------------------
// Local view of aggregate earnings subclass - subclass of roundedRect
//--------------------------------------------------------------------------------------------------
biofuelsGame.localEarningsGraph = function() 
{
    // must call super constructor
    lime.RoundedRect.call(this);

    this.HALF_SIZE_X = 100;
    this.HALF_SIZE_Y = 70;
    
    this.FRAME_BORDER_SIZE = 12;
    
    // graph "container" styling
    this.setSize(this.HALF_SIZE_X * 2, this.HALF_SIZE_Y * 2).setRadius(this.FRAME_BORDER_SIZE);
    this.setFill('#FEF8D0').setStroke(new lime.fill.Stroke(this.FRAME_BORDER_SIZE, '#664'));     
    
    // graph element properties - TODO: any common stylings should end up in one place, ideally
	var TITLE_FONT_SIZE = 13;
	var TITLE_FONT_COLOR = '#fff';
	
	var LABEL_FONT_SIZE = 10;
	var LABEL_FONT_COLOR = '#777';
	
	var GRID_WIDTH = 1;
	var GRID_COLOR = '#888';
	
	// The actual data plot style (currently not filled)
	var PLOT_STROKE_WIDTH = 2;
	var PLOT_STROKE_COLOR  = '#d5d';
        	
	var graphTitle = makeLabel('Farmer Earnings', 0, -(this.HALF_SIZE_Y - (this.FRAME_BORDER_SIZE / 2) + 2), 
									TITLE_FONT_SIZE, TITLE_FONT_COLOR, 'center');
	graphTitle.setSize(this.HALF_SIZE_X * 2, this.FRAME_BORDER_SIZE);
	this.appendChild(graphTitle);
	
	// TEMP: make some fake data for dev'ing graph - 10 years, 8 farmers
	this.earningsData = bakeFakeEarningsData(10, 8);
	
	this.updateGraph(this.earningsData);
};

goog.inherits(biofuelsGame.localEarningsGraph, lime.RoundedRect);

// Helper - could be part of the class but would really just be private anyway
//	returns a two element array [min, max] from an earnings array earnings[years][farmers]
//-----------------------------------------------------------------------------------
function getDollarRange(earningsArray)
{
	// if no years...or a year but no farmers, just return some default
	if (earningsArray.length <= 0 || earningsArray[0].length <= 0) 
	{
		return [0, 50]; // eh, 0 dollars to 50k dollars
	}
	
	// init from first element
	var min = earningsArray[0][0];
	var max = min;
	
	for (var year = 0; year < earningsArray.length; year++)
	{
		for (var farmer = 0; farmer < earningsArray[year].length; farmer++)
		{
			if (earningsArray[year][farmer] > max) 
			{
				max = earningsArray[year][farmer];
			}
			else if (earningsArray[year][farmer] < min)
			{
				min = earningsArray[year][farmer]
			}
		}
	}
	
	return [min, max];
}

// Helper - could be part of the class but would really just be private anyway
//	returns a two element array [min, max] from an earnings array earnings[years][farmers]
//-----------------------------------------------------------------------------------
function getDollarRangeForYear(earningsArray, year)
{	
	// if no years...or requesting a year past what we have...or a year but no farmers...just return some default
	if (earningsArray.length <= 0 || year >= earningsArray.length || earningsArray[year].length <= 0) 
	{
		return [0, 50]; // eh, 0 dollars to 50k dollars
	}
	
	// init from first element
	var min = earningsArray[year][0];
	var max = min;
	
	for (var farmer = 0; farmer < earningsArray[year].length; farmer++)
	{
		if (earningsArray[year][farmer] > max) 
		{
			max = earningsArray[year][farmer];
		}
		else if (earningsArray[year][farmer] < min)
		{
			min = earningsArray[year][farmer]
		}
	}
	
	return [min, max];
}

// datapoints currently expected to be a two-D array like this: earnings[years][farmers]
// TODO: allocates new lines/labels every call...either need to delete the old ones and
//	remove them from the scene graph/tree...or maybe recycle ones that were already allocated.
//-----------------------------------------------------------------------------------
biofuelsGame.localEarningsGraph.prototype.updateGraph = function(earningsArray)
{
	var leftPad = 35;
	var rightPad = -10;
	var bottomPad = -15;
	var topPad = 10;
	
	// the actual graph resides within a portion of the whole frame, to allow for
	//	extra room to plot graph labels, etc.
	var right = this.HALF_SIZE_X - this.FRAME_BORDER_SIZE + rightPad;
	var left = -(this.HALF_SIZE_X - this.FRAME_BORDER_SIZE) + leftPad;
	var top = -(this.HALF_SIZE_Y - this.FRAME_BORDER_SIZE) + topPad;
	var bottom = this.HALF_SIZE_Y - this.FRAME_BORDER_SIZE + bottomPad;
	
	var yearSpacing = (right - left) / (earningsArray.length - 1);

	// get range (mostly just care about max) and expand max a bit so it doesn't end up exactly at the top 
	var dollarRange = getDollarRange(earningsArray);
	var maxDollar = dollarRange[1] * 1.1;
	var dollarScaling = (bottom - top) / maxDollar;
	var horzLines = 8;

	var atX = left;
	// draw the min-max range of all farmers behind the grid since there can easily be seams between the
	//	polygon slices.  Drawing the grid on top helps hide that aspect
	for (var year = 0; year < earningsArray.length - 1; year++)
	{
		var rangeNow = getDollarRangeForYear(earningsArray, year);
		var rangeNext = getDollarRangeForYear(earningsArray, year + 1);

		var poly = new lime.Polygon().setFill('#999968');
		// bah, bloating up the polygon by a pixel or so on either side to reduce seams
		poly.addPoint(new goog.math.Coordinate(atX - 1, bottom - rangeNow[1] * dollarScaling));
		poly.addPoint(new goog.math.Coordinate(atX - 1, bottom - rangeNow[0] * dollarScaling));
		poly.addPoint(new goog.math.Coordinate(atX + 1 + yearSpacing, bottom - rangeNext[0] * dollarScaling));
		poly.addPoint(new goog.math.Coordinate(atX + 1 + yearSpacing, bottom - rangeNext[1] * dollarScaling));
		this.appendChild(poly);
		
		atX += yearSpacing;
	}

	var atX = left;
	for (var year = 0; year < earningsArray.length; year++)
	{
		var line = makeLine(1, atX, top, atX, bottom).setFill('#aaa');
		this.appendChild(line);
		
		var label = makeLabel(year + 1, atX, bottom - (bottomPad / 2), 10, '#000', 'center');
		this.appendChild(label);
		
		atX += yearSpacing;
	}
	
	
	for (var idx = 0; idx < horzLines; idx++)
	{
		var dollar = (idx / (horzLines - 1)) * maxDollar;
		var atY = bottom - (dollar * dollarScaling);

		var line = makeLine(1, left, atY, right, atY).setFill('#aaa');
		this.appendChild(line);
		
		var label = makeLabel("$" + (dollar/1000).toFixed(0) + "k", left - (leftPad / 2), atY, 10, '#000', 'center');
		this.appendChild(label);
	}
		
	var strokeSize = 2;
	var clientFarmerIdx = 3;
	var fill = '#d40';
	
	var prevDollar = earningsArray[0][clientFarmerIdx];
	atX = left;
	for (var year = 0; year < earningsArray.length; year++)
	{
		var currentDollar = earningsArray[year][clientFarmerIdx];
		
		if (year > 0)
		{
			var line = makeLine(strokeSize, atX - yearSpacing, bottom - prevDollar * dollarScaling,
									atX, bottom - currentDollar * dollarScaling).setFill(fill);
			this.appendChild(line);
		}
		
		prevDollar = currentDollar;
		atX += yearSpacing;
	}
}

