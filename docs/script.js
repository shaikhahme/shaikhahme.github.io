$(document).ready(function () {
    function checkVisibility() {
        $("section").each(function () {
            let sectionTop = $(this).offset().top;
            let sectionHeight = $(this).outerHeight();
            let viewportTop = $(window).scrollTop();
            let viewportBottom = viewportTop + $(window).height();

            if (sectionTop < viewportBottom - 50 && sectionTop + sectionHeight > viewportTop + 50) {
                $(this).addClass("in-view")
                }
            else {
                $(this).removeClass("in-view");
                }

        });
    }

    $(window).on("scroll resize", checkVisibility);
    checkVisibility();
});

$(document).ready(function () {
    $(".read-more-btn").click(function () {
        let moreText = $(this).prev(".more-text");

        if (moreText.is(":visible")) {
            moreText.fadeOut(400);
            $(this).text("Read More");
        } else {
            moreText.fadeIn(600);
            $(this).text("Read Less");
        }
    });
});
