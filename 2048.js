(function (App, document) {
    function Game() {
        let dom = {};
        let templates = {};
        let buffer = {
            requiredValue: 2048,

            gridSizeX: 4,
            gridSizeY: 4,

            colors: {
                text: [ 119, 110, 101 ],
                bg: [ 238, 228, 218 ],
            },
            lock: false,
            animationDelay: 200,

            pushMap: {
                'up': ((box) => [ box.x, box.y - 1 ]),
                'right': ((box) => [ box.x + 1, box.y ]),
                'down': ((box) => [ box.x, box.y + 1 ]),
                'left': ((box) => [ box.x - 1, box.y ]),
            },

            sortMap: {
                'up': ((a, b) => ((b.y - a.y) || (b.x - a.x))),
                'right': ((a, b) => ((a.x - b.x) || (b.y - a.y))),
                'down': ((a, b) => ((a.y - b.y) || (b.x - a.x))),
                'left': ((a, b) => ((b.x - a.x) || (b.y - a.y))),
            },

            lenMap: {
                'up': ((box) => box.y),
                'right': ((box) => (buffer.gridSizeX - box.x)),
                'down': ((box) => (buffer.gridSizeY - box.y)),
                'left': ((box) => box.x),
            },

            keys: [
                [ 'ArrowDown', onDocumentKeydownArrowDown ],
                [ 'ArrowUp', onDocumentKeydownArrowUp ],
                [ 'ArrowLeft', onDocumentKeydownArrowLeft ],
                [ 'ArrowRight', onDocumentKeydownArrowRight ],
            ],
            bind: {},

            boxStyle: null,
            boxSize: null,

            boxes: [],
            boxesMap: [],
        };


        document.addEventListener( 'DOMContentLoaded', init );


        function init() {
            reset();
        }

        function reset() {
            removeBoxes();

            dom.overlay = document.querySelector( '.js-game__overlay' );

            templates.item = document.querySelector( '#js-templates .js-game__item' );

            buffer.boxStyle = getComputedStyle( document.querySelector( '#js-templates .js-game__box' ) );
            buffer.boxSize = 0
                + (parseInt( buffer.boxStyle.width, 10 ))
                + (parseInt( buffer.boxStyle.marginLeft, 10 ) * 2);

            buffer.boxes = [];
            buffer.boxesMap = {};
            for ( let x = 1; x <= buffer.gridSizeX; x++ ) {
                for ( let y = 1; y <= buffer.gridSizeY; y++ ) {
                    buffer.boxesMap[ mapCoordsToKey( x, y ) ] = null;
                }
            }

            newBoxRandom();
            newBoxRandom();

            buffer.bind = {};
            for ( let [ key, func ] of buffer.keys ) {
                buffer.bind[ key ] = buffer.bind[ key ] || [];
                buffer.bind[ key ].push( func );
            }

            document.removeEventListener( 'keydown', onDocumentKeydown );
            document.addEventListener( 'keydown', onDocumentKeydown );
        }


        function newBox(x, y) {
            x = parseInt( x, 10 );
            y = parseInt( y, 10 );

            let values = [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 4 ]; // 90/10
            let random = Math.floor( Math.random() * values.length );

            let box = {
                value: values[ random ],
                x: x,
                y: y,
                dom: templates.item.cloneNode(),
            };

            buffer.boxes.push( box );

            dom.overlay.appendChild( box.dom );

            renderBoxValue( box );
            renderBoxPosition( box );

            placeBox( box );

            return box;
        }

        function newBoxRandom() {
            let free = [];
            for ( let key in buffer.boxesMap ) {
                if (! buffer.boxesMap.hasOwnProperty( key )) continue;

                if (null !== buffer.boxesMap[ key ]) continue;

                free.push( key );
            }

            if (! free.length) {
                return null;
            }

            let random = Math.floor( Math.random() * free.length );
            let [ x, y ] = mapKeyToCoords( free[ random ] );

            let box = newBox( x, y );

            return box;
        }


        function removeBox(box) {
            clearBox( box );

            buffer.boxes.splice( buffer.boxes.indexOf( box ), 1 );

            box.dom.remove();
        }

        function removeBoxes() {
            for ( let box of buffer.boxes ) {
                buffer.boxesMap[ mapCoordsToKey( box.x, box.y ) ] = null;

                box.dom.remove();
            }

            buffer.boxes = [];
        }


        function hasBox(x, y) {
            return (null !== buffer.boxesMap[ mapCoordsToKey( x, y ) ]);
        }

        function findBox(x, y) {
            return buffer.boxesMap[ mapCoordsToKey( x, y ) ];
        }

        function placeBox(box) {
            if (hasBox( box.x, box.y )) {
                throw 'Ячейка занята';
            }

            buffer.boxesMap[ mapCoordsToKey( box.x, box.y ) ] = box;
        }

        function clearBox(box) {
            if (! hasBox( box.x, box.y )) {
                throw 'Ячейка пуста';
            }

            buffer.boxesMap[ mapCoordsToKey( box.x, box.y ) ] = null;
        }


        async function moveBox(box, direction, len) {
            let collapseBox, isMoved;

            len = parseInt( len, 10 );

            if (len < 1) {
                return false;
            }

            isMoved = false;
            while ( len-- ) {
                let [ x, y ] = buffer.pushMap[ direction ]( box );

                if (x < 1) return isMoved;
                if (y < 1) return isMoved;
                if (x > buffer.gridSizeX) return isMoved;
                if (y > buffer.gridSizeY) return isMoved;
                if (0
                    && (x === box.x)
                    && (y === box.y)
                ) return isMoved;

                if (collapseBox = findBox( x, y )) {
                    if (await mergeBox( box, collapseBox )) {
                        await pushBox( box, x, y );

                        isMoved = true;

                        continue;
                    }

                    return isMoved;
                }

                await pushBox( box, x, y );

                isMoved = true;
            }

            return isMoved;
        }

        async function mergeBox(box, collapseBox) {
            if (box.value !== collapseBox.value) {
                return false;
            }

            await new Promise( resolve => setTimeout( resolve, buffer.animationDelay ) );

            let val = box.value + collapseBox.value;

            setBoxValue( box, val );

            removeBox( collapseBox );

            return true;
        }

        async function pushBox(box, x, y) {
            await new Promise( resolve => setTimeout( resolve, buffer.animationDelay ) );

            clearBox( box );
            setBoxPosition( box, x, y );
            placeBox( box );
        }


        function setBoxValue(box, value) {
            value = parseInt( value, 10 );

            box.value = value;

            renderBoxValue( box );
        }

        function setBoxPosition(box, x, y) {
            x = parseInt( x, 10 );
            y = parseInt( y, 10 );

            box.x = x;
            box.y = y;

            renderBoxPosition( box );
        }


        function calculate() {
            buffer.max = 0;
            buffer.min = +Infinity;

            buffer.boxes.map( function (box) {
                buffer.max = Math.max( buffer.max, box.value );
                buffer.min = Math.min( buffer.min, box.value );
            } );

            buffer.boxes.map( function (box) {
                renderBoxBackground( box );
            } );
        }

        function step() {
            calculate();

            if (buffer.max === buffer.requiredValue) {
                success();
                return;
            }

            if (false) {
                // проверяем условие поражения
                fail();
                return;
            }
        }


        function success() {
            alert( 'Победа' );
            reset();
        }

        function fail() {
            alert( 'Поражение' );
            reset();
        }


        function mapCoordsToKey(x, y) {
            x = parseInt( x, 10 );
            y = parseInt( y, 10 );

            return `${x}.${y}`;
        }

        function mapKeyToCoords(key) {
            return key.split( '.' ).map( v => parseInt( v, 10 ) );
        }


        function renderBoxValue(box) {
            box.dom.innerText = box.value;
        }

        function renderBoxPosition(box) {
            let top = buffer.boxSize * (box.y - 1);
            let left = buffer.boxSize * (box.x - 1);

            box.dom.style.setProperty( 'top', top + 'px' );
            box.dom.style.setProperty( 'left', left + 'px' );
        }

        function renderBoxBackground(box) {
            let percent = ((box.value - buffer.min) / (buffer.max - buffer.min));

            let colorText = [
                (percent >= 0.5) ? 255 : buffer.colors.text[ 0 ],
                (percent >= 0.5) ? 255 : buffer.colors.text[ 1 ],
                (percent >= 0.5) ? 255 : buffer.colors.text[ 2 ],
            ];
            let colorBg = [
                buffer.colors.bg[ 0 ] + ((255 - buffer.colors.bg[ 0 ]) * percent),
                buffer.colors.bg[ 1 ] + ((0 - buffer.colors.bg[ 1 ]) * percent),
                buffer.colors.bg[ 2 ] + ((0 - buffer.colors.bg[ 2 ]) * percent),
            ];

            box.dom.style.setProperty( 'color', `rgb(${colorText[ 0 ]}, ${colorText[ 1 ]}, ${colorText[ 2 ]})` );
            box.dom.style.setProperty( 'background-color', `rgb(${colorBg[ 0 ]}, ${colorBg[ 1 ]}, ${colorBg[ 2 ]})` );
        }


        async function up() {
            buffer.lock = true;

            await move( 'up' );
            step();

            buffer.lock = false;
        }

        async function down() {
            buffer.lock = true;

            await move( 'down' );
            step();

            buffer.lock = false;
        }

        async function left() {
            buffer.lock = true;

            await move( 'left' );
            step();

            buffer.lock = false;
        }

        async function right() {
            buffer.lock = true;

            await move( 'right' );
            step();

            buffer.lock = false;
        }


        async function move(direction) {
            let boxes, i, isChanged;

            boxes = [ ...buffer.boxes ];

            boxes.sort( buffer.sortMap[ direction ] );

            isChanged = false;
            i = buffer.boxes.length;
            while ( i-- ) {
                let box = boxes[ i ];
                let len = buffer.lenMap[ direction ]( box );

                isChanged = await moveBox( box, direction, len ) || isChanged;
            }

            if (isChanged) {
                newBoxRandom();

            } else if (Object.keys( buffer.boxesMap ).length === buffer.boxes.length) {
                fail();

            }

            return true;
        }



        function onDocumentKeydown(event) {
            if (buffer.lock) {
                return;
            }

            if (event.defaultPrevented) {
                return;
            }

            if (! buffer.bind[ event.key ]) {
                return;
            }

            for ( let func of buffer.bind[ event.key ] ) {
                func( event );
            }

            event.preventDefault();
        }

        function onDocumentKeydownArrowUp(event) {
            up();
        }

        function onDocumentKeydownArrowRight(event) {
            right();
        }

        function onDocumentKeydownArrowDown(event) {
            down();
        }

        function onDocumentKeydownArrowLeft(event) {
            left();
        }


        this.dom = dom;
        this.buffer = buffer;

        return this;
    }

    App.Game = Game;
})( window.App, document );