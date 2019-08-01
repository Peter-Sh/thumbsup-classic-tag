$(function(){
	$('.tagger-switch').on('click', toggleTagger);

	function toggleTagger(e) {
		$(e.target).parents('.captor').children('.tagger-window').css('visibility', 'visible');
		console.log(e);
	}
	function getTags($el) {
			let tags = [];
			$el.find('.addedTag').each(function (idx, li) {
					if ($(li).data('tagName')) {
						tags.push($(li).data('tagName'));
					}
			});

			return tags;
	}
	function addTag(value, where) {
		let tags = getTags(locateTagsContainer(where));
		if (tags.indexOf(value) !== -1) {
				return;
		}
		$('<li>' + value + '</li>')
			.addClass('addedTag')
			.data('tagName', value)
			.append($('<span>x</span>').addClass('tagRemove'))
			.insertBefore(where);

		return value;
	}
	function locateInsertPoint(from) {
			return from.parents('.tag-editor').find('.tags .tagAdd')
	}
	function locateTagsContainer(from) {
			return from.parents('.tag-editor').find('.tags')
	}
	function locateTagIput(from)
	{
			return from.parents('.tag-editor').find('.tag-input-text')
	}

	$.expr[":"].contains = $.expr.createPseudo(function(arg) {
	    return function( elem ) {
		return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
	    };
	});
	$('.tags').on('click', '.tagRemove', function (event) {
		event.preventDefault();
		$(this).parent().remove();
	});
	$('ul.tags').click(function() {
		$('#search-field').focus();
	});
	$('.tag-input-text').keypress(function (event) {
        if (event.which == '13') {
				addTag($(this).val(), locateInsertPoint($(this)));
				$(this).val('');
		}
	});
	$('.tag-input-add').click(function (event) {

		addTag(locateTagIput($(this)).val(), locateInsertPoint($(this)));
		locateTagIput($(this)).val('');
	});
    $('#search-field').keypress(function(event) {
        if (event.which == '13') {
            if (($(this).val() != '') && ($(".tags .addedTag:contains('" + $(this).val() + "') ").length == 0 ))  {
                $('<li>' + $(this).val() + '</li>')
                    .addClass('addedTag')
                    .data('tagName', $(this).val())
                    .append($('<span>x</span>').addClass('tagRemove'))
                    .insertBefore('.tags .tagAdd');

            }
            $(this).val('');
        }
    });
});
