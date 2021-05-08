class Utils {
    static ValueAssign(to, from) {
        const valuableValues = {};
        for (let key of Object.keys(from)) {
            let value = from[key];
            if (value == null || value == undefined) {
                continue;
            }
            valuableValues[key] = value;
        }
        return Object.assign(to, valuableValues);
    }
}

class SliderOptions {
    constructor({ size = 9999, itemsOnScreen, gap = 15 } = {}) {
        this.size = size;
        this.itemsOnScreen = itemsOnScreen;
        this.gap = gap;
    }
}

class Slider {
    static sliders = [];

    /**ctor */
    constructor(element, mainOptions, optionsArray) {
        this.element = element;
        this.breakpoints = optionsArray;

        this.options = mainOptions;
        this.currentBreakpoint = mainOptions.size;
        this.breakpoints.push(Object.assign({}, mainOptions));

        this.offset = 0;
        this.index = 0;

        Slider.sliders.push(this);
    }

    resizeHandle(newWidth) {
        const newOptions = Slider.getCurrentOptionsByWidth(newWidth, this.breakpoints);

        if (!newOptions) return;

        if (this.currentBreakpoint == newOptions.size) return;

        this.currentBreakpoint = newOptions.size;

        Utils.ValueAssign(this.options, newOptions);

        Slider.Update(this);
    }

    static getCurrentOptionsByWidth(width, optionsArray) {
        const sortedArray = optionsArray;
        sortedArray.sort((l, r) => r - l);
        return sortedArray.find(opts => opts.size >= width);
    }

    /**Offset */
    get Offset() {
        return this.offset;
    }
    /**Offset set */
    set Offset(value) {
        value = Math.min(value, this.getMaxLength() + this.options.gap * 3);
        value = Math.max(value, -50);
        this.offset = value;
        this.element.style.setProperty('--x-offset', value);
    }

    /**get total length -1 screen */
    getMaxLength() {
        const screensCount = Math.ceil(this.track.children.length / this.options.itemsOnScreen) - 1;
        return screensCount * this.track.offsetWidth;
    }

    getScreenLength() {
        return this.element.offsetWidth;
    }

    /**go back */
    prev() {
        const slider = this;

        slider.clearAnimation();

        let currentOffset = slider.offset;

        if (currentOffset <= 0) return;

        const screenSize = slider.getScreenLength();

        let nearestIndexDistance = currentOffset % screenSize;
        let distanceToMove = nearestIndexDistance == 0 ? screenSize : nearestIndexDistance;

        return slider.makeMoveAnimate(+distanceToMove).then(() => slider.setCurrentIndex());
    }

    /**go ahead */
    next() {
        const slider = this;

        slider.clearAnimation();

        const maxLength = slider.getMaxLength();
        const screenSize = slider.getScreenLength();
        const currentOffset = slider.offset;
        const gap = slider.options.gap;
        const items = slider.options.itemsOnScreen;
        if (currentOffset >= maxLength) return;

        let nearestIndexDistance = currentOffset % screenSize;
        let distanceToMove = nearestIndexDistance == 0 ? screenSize : screenSize - nearestIndexDistance;

        return slider.makeMoveAnimate(-distanceToMove).then(() => slider.setCurrentIndex());
    }

    dotHandle(dot) {
        const target = dot;
        const slider = this;
        slider.clearAnimation();

        const index = Number(target.dataset.index);
        const screenSize = slider.getScreenLength();
        const currentOffset = slider.offset;
        const distanceToMove = index * screenSize - currentOffset;
        return slider.makeMoveAnimate(-distanceToMove).then(() => {
            slider.setCurrentIndex();
        });
    }

    /**create new slider and activate it */
    static Create(sliderDomElement, options, optionsArray) {
        const slider = new Slider(sliderDomElement, options, optionsArray);

        Slider.Activate(slider);
        Slider.generateDots(slider);
        Slider.initScreen(slider);

        return slider;
    }

    /**activate and initialize slider */
    static Activate(slider) {
        Slider.findElements(slider);
        Slider.initLayout(slider);
        Slider.generateDots(slider);
        Slider.initScreen(slider);

        Slider.initEvents(slider);
    }

    static Update(slider) {
        Slider.initLayout(slider);
        Slider.generateDots(slider);
        Slider.initScreen(slider);
    }

    /**handle moving starting and set end logick */
    handleMoveStart(startX) {
        const slider = this;
        slider.moving = true;
        slider.startX = startX;
        slider.startOffset = slider.offset;
        slider.currentDistance = startX;

        window.cancelAnimationFrame(slider.animation);

        const moveFunction = slider.handleMove.bind(slider);

        document.documentElement.addEventListener('mousemove', moveFunction, { passive: true });
        document.documentElement.addEventListener('touchmove', moveFunction, { passive: true });

        const upHandle = (e) => {
            document.documentElement.removeEventListener('mousemove', moveFunction);
            document.documentElement.removeEventListener('touchmove', moveFunction);

            slider.moving = false;

            window.cancelAnimationFrame(slider.animation);

            slider.makeMoveAnimate(slider.getRemainingDistance() * -3)
                .then(() => slider.setCurrentIndex());

            document.documentElement.removeEventListener("mouseup", upHandle);
            document.documentElement.removeEventListener("touchend", upHandle);
        }
        document.documentElement.addEventListener("mouseup", upHandle, { once: true, passive: true });
        document.documentElement.addEventListener("touchend", upHandle, { once: true, passive: true });

        slider.moveAnimation();
    }

    /**handle move events */
    handleMove(event) {
        const slider = this;
        slider.currentDistance = slider.getCurrentX(event);
    }

    /**get current clientX from any move event */
    getCurrentX(event) {
        return event.clientX ?? event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX;
    }

    /**find all necessary elements of the slider */
    static findElements(slider) {
        const sliderElement = slider.element;
        slider.leftArrow = sliderElement.querySelector('[data-element="slider-left"]');
        slider.rightArrow = sliderElement.querySelector('[data-element="slider-right"]');
        slider.dots = sliderElement.querySelector('[data-element="slider-dots"]');
        slider.track = sliderElement.querySelector('[data-element="slider-track"]');
    }

    /**init layout logick */
    static initLayout(slider) {
        slider.element.style.setProperty("--items", slider.options.itemsOnScreen);
        slider.element.style.setProperty("--gap", slider.options.gap + "px");
    }

    /**generate dots and mark current screen */
    static generateDots(slider) {
        const screensCount = Math.ceil(slider.track.children.length / slider.options.itemsOnScreen);

        while (slider.dots.firstChild) {
            slider.dots.firstChild.remove();
        }

        for (let i = 0; i < screensCount; i++) {
            slider.dots.insertAdjacentHTML("beforeend", `<div class="slider__dot" data-element="slider-dot" data-index="${i}"></div>`);
        }
    }

    /**init all handlers */
    static initEvents(slider) {
        const handleFunction = (e) => {
            const target = e.target;
            const targetClosest = target.closest('[data-element="slider-item"]');

            if (targetClosest) {
                slider.handleMoveStart(slider.getCurrentX(e));
            }
            e.preventDefault();
        }
        slider.track.addEventListener('mousedown', handleFunction);
        slider.track.addEventListener('touchstart', handleFunction);

        slider.leftArrow.addEventListener("click", () => {
            slider.prev();
        }, { passive: true });
        slider.rightArrow.addEventListener("click", () => {
            slider.next();
        }, { passive: true });
        slider.dots.addEventListener("click", (e) => {
            if (e.target.dataset.element == "slider-dot") slider.dotHandle(e.target);
        }, { passive: true });
    }

    /**init screen work */
    static initScreen(slider) {
        slider.remarkDot();
    }

    /**loop move animation */
    moveAnimation() {
        let slider = this;
        slider.animation = requestAnimationFrame(() => {
            let passedDistance = slider.offset - slider.startOffset;
            let distanceToMove = slider.startX - slider.currentDistance;
            let remainingDistance = distanceToMove - passedDistance;

            slider.Offset = slider.Offset + remainingDistance * 0.1;

            slider.moveAnimation();
        });
    }

    /**move animation having the end */
    moveEndAnimation(isInert = true) {
        let slider = this;

        return new Promise((resolve) => {
            slider.animation = requestAnimationFrame(function animate(time) {
                let passedDistance = slider.offset - slider.startOffset;
                let distanceToMove = slider.startX - slider.currentDistance;
                let remainingDistance = (distanceToMove - passedDistance);
                let newOffset = slider.Offset + remainingDistance * 0.1;


                if (Math.abs(remainingDistance) < 1) {
                    slider.Offset = slider.startOffset + distanceToMove;
                    return resolve();
                }
                if (Slider.isInRange(slider, newOffset) == false) {
                    return resolve();
                }

                slider.Offset = newOffset;
                requestAnimationFrame(animate);
            });
        });
    }

    getRemainingDistance() {
        const slider = this;
        let passedDistance = slider.offset - slider.startOffset;
        let distanceToMove = slider.startX - slider.currentDistance;
        return (distanceToMove - passedDistance);
    }

    makeMoveAnimate(distanceToMove) {
        const slider = this;

        slider.currentDistance = distanceToMove;
        slider.startX = 0;
        slider.startOffset = slider.offset;
        return slider.moveEndAnimation(false);
    }

    clearAnimation() {
        window.cancelAnimationFrame(this.animation);
    }

    setCurrentIndex() {
        const slider = this;

        const currentOffset = slider.offset;

        const index = Math.floor(currentOffset / slider.getScreenLength());
        slider.index = index;

        if (currentOffset <= 0) slider.index = 0;
        slider.remarkDot();
    }

    remarkDot() {
        const dots = this.dots.querySelectorAll('[data-element="slider-dot"]');
        for (let dot of dots) {
            dot.classList.remove('_active');
            if (dot.dataset.index == this.index) dot.classList.add('_active');
        }
    }

    /**is value in a slider range */
    static isInRange(slider, newOffset) {
        return newOffset > -50 && newOffset < slider.getMaxLength() + slider.options.gap * 3 + 1;
    }

    static Init() {
        Slider.observer = new ResizeObserver((entries) => {
            for (let i = 0; i < Slider.sliders.length; i++) {
                Slider.sliders[i].resizeHandle(entries[0].contentRect.width);
            }
        });

        Slider.observer.observe(window.document.documentElement);
    }
}




window.addEventListener("load", () => {
    Slider.Init();

    const sliderOption = new SliderOptions();
    sliderOption.itemsOnScreen = 4;
    const slider = Slider.Create(document.getElementById("slider"), sliderOption, [new SliderOptions({ gap: 30, size: 654, itemsOnScreen: 2 })]);
}, { passive: true });