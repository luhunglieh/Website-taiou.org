"use strict";

jQuery(document).ready(function ($) {
    // 移除阻礙渲染的 preloader
    jQuery(".loaded, .preloader").remove();

    /* Mobile menu */
    $(document).on('click', '.navbar-collapse.in', function (e) {
        if ($(e.target).is('a')) {
            $(this).collapse('hide');
        }
    });

    $('ul.navbar-nav li').hover(function () {
        $(this).children('ul').stop(true, false, true).fadeToggle(300);
    });

    /* 
     * STICKY menu & Scroll Up (使用 requestAnimationFrame 與 passive 監聽進行極致節流)
     */
    var $navbar = $('.navbar-fixed-top');
    var $scrollup = $('.scrollup');
    var isScrolling = false;

    window.addEventListener('scroll', function () {
        if (!isScrolling) {
            window.requestAnimationFrame(function () {
                var top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                
                // Sticky Navbar Toggle
                if (top > 5) {
                    $navbar.addClass('menu-scroll');
                } else {
                    $navbar.removeClass('menu-scroll');
                }

                // Scroll Up Button Toggle
                if (top > 600) {
                    $scrollup.fadeIn('slow');
                } else {
                    $scrollup.fadeOut('slow');
                }

                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    $scrollup.click(function () {
        $("html, body").animate({ scrollTop: 0 }, 600);
        return false;
    });
});
