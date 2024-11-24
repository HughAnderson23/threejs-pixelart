import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

let camera, scene, renderer, composer, crystalMesh, clock
let gui, params

init();

    function init() {

        const aspectRatio = window.innerWidth / window.innerHeight;

        camera = new THREE.OrthographicCamera( - aspectRatio, aspectRatio, 1, - 1, 0.1, 10 );
        camera.position.y = 2 * Math.tan( Math.PI / 6 );
        camera.position.z = 2;

        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0x151729 );

        clock = new THREE.Clock();

        renderer = new THREE.WebGLRenderer();
        renderer.shadowMap.enabled = true;
        //renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setAnimationLoop( animate );
        document.body.appendChild( renderer.domElement );

        composer = new EffectComposer( renderer );
        const renderPixelatedPass = new RenderPixelatedPass( 6, scene, camera );
        composer.addPass( renderPixelatedPass );

        const outputPass = new OutputPass();
        composer.addPass( outputPass );

        window.addEventListener( 'resize', onWindowResize );

        const controls = new OrbitControls( camera, renderer.domElement );
        controls.maxZoom = 2;

        // gui

        gui = new GUI();
        params = { pixelSize: 6, normalEdgeStrength: .3, depthEdgeStrength: .4, pixelAlignedPanning: true };
        gui.add( params, 'pixelSize' ).min( 1 ).max( 16 ).step( 1 )
            .onChange( () => {

                renderPixelatedPass.setPixelSize( params.pixelSize );

            } );
        gui.add( renderPixelatedPass, 'normalEdgeStrength' ).min( 0 ).max( 2 ).step( .05 );
        gui.add( renderPixelatedPass, 'depthEdgeStrength' ).min( 0 ).max( 1 ).step( .05 );
        gui.add( params, 'pixelAlignedPanning' );

        // textures
        const parameters = {
            grassMaterialColor: '#8ac165',
            stoneMaterialColor: '#ffeded'
        }
        const textureLoader = new THREE.TextureLoader();
        const gradientTexture = textureLoader.load('textures/gradients/3.jpeg')
        gradientTexture.magFilter = THREE.NearestFilter

        const grassMaterial = new THREE.MeshStandardMaterial({
            color: parameters.grassMaterialColor,
            
        })
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: parameters.stoneMaterialColor,
            
        })

        // meshes

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(.3,.3,.3),
            stoneMaterial
        )
        box.position.y = .25
        box.castShadow = true
        box.receiveShadow = true
        scene.add(box)

        const box2 = new THREE.Mesh(
            new THREE.BoxGeometry(.3,.8,.3),
            stoneMaterial
        )
        box2.position.x = .4
        box2.position.y = .4
        box2.position.z = -0.4
        box2.rotation.y = Math.PI * 0.25
        box2.castShadow = true
        box2.receiveShadow = true
        scene.add(box2)

        const planeSideLength = 2;
        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry( planeSideLength, planeSideLength ),
            grassMaterial
        );
        planeMesh.receiveShadow = true;
        planeMesh.rotation.x = - Math.PI / 2;
        scene.add( planeMesh );

        const radius = .2;
        const geometry = new THREE.IcosahedronGeometry( radius );
        crystalMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial( {
                color: 0x68b7e9,
                emissive: 0x4f7e8b,
                shininess: 10,
                specular: 0xffffff
            } )
        );
        crystalMesh.receiveShadow = true;
        crystalMesh.castShadow = true;
        scene.add( crystalMesh );

        // lights

        scene.add( new THREE.AmbientLight( 0x757f8e, 3 ) );

        const directionalLight = new THREE.DirectionalLight( 0xfffecd, 1.5 );
        directionalLight.position.set( 100, 100, 100 );
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set( 2048, 2048 );
        scene.add( directionalLight );

        const spotLight = new THREE.SpotLight( 0xffc100, 10, 10, Math.PI / 16, .02, 2 );
        spotLight.position.set( 2, 2, 0 );
        const target = spotLight.target;
        scene.add( target );
        target.position.set( 0, 0, 0 );
        spotLight.castShadow = true;
        scene.add( spotLight );

    }

		function onWindowResize() {

			const aspectRatio = window.innerWidth / window.innerHeight;
			camera.left = - aspectRatio;
			camera.right = aspectRatio;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );
			composer.setSize( window.innerWidth, window.innerHeight );

		}

		function animate() {

			const t = clock.getElapsedTime();

			crystalMesh.material.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5;
			crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05;
			crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI;

			const rendererSize = renderer.getSize( new THREE.Vector2() );
			const aspectRatio = rendererSize.x / rendererSize.y;
			if ( params[ 'pixelAlignedPanning' ] ) {

				pixelAlignFrustum( camera, aspectRatio, Math.floor( rendererSize.x / params[ 'pixelSize' ] ),
					Math.floor( rendererSize.y / params[ 'pixelSize' ] ) );

			} else if ( camera.left != - aspectRatio || camera.top != 1.0 ) {

				// Reset the Camera Frustum if it has been modified
				camera.left = - aspectRatio;
				camera.right = aspectRatio;
				camera.top = 1.0;
				camera.bottom = - 1.0;
				camera.updateProjectionMatrix();

			}

			composer.render();

		}

		// Helper functions

		function pixelTexture( texture ) {

			texture.minFilter = THREE.NearestFilter;
			texture.magFilter = THREE.NearestFilter;
			texture.generateMipmaps = false;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.colorSpace = THREE.SRGBColorSpace;
			return texture;

		}

		function easeInOutCubic( x ) {

			return x ** 2 * 3 - x ** 3 * 2;

		}

		function linearStep( x, edge0, edge1 ) {

			const w = edge1 - edge0;
			const m = 1 / w;
			const y0 = - m * edge0;
			return THREE.MathUtils.clamp( y0 + m * x, 0, 1 );

		}

		function stopGoEased( x, downtime, period ) {

			const cycle = ( x / period ) | 0;
			const tween = x - cycle * period;
			const linStep = easeInOutCubic( linearStep( tween, downtime, period ) );
			return cycle + linStep;

		}

		function pixelAlignFrustum( camera, aspectRatio, pixelsPerScreenWidth, pixelsPerScreenHeight ) {

			// 0. Get Pixel Grid Units
			const worldScreenWidth = ( ( camera.right - camera.left ) / camera.zoom );
			const worldScreenHeight = ( ( camera.top - camera.bottom ) / camera.zoom );
			const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
			const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

			// 1. Project the current camera position along its local rotation bases
			const camPos = new THREE.Vector3(); camera.getWorldPosition( camPos );
			const camRot = new THREE.Quaternion(); camera.getWorldQuaternion( camRot );
			const camRight = new THREE.Vector3( 1.0, 0.0, 0.0 ).applyQuaternion( camRot );
			const camUp = new THREE.Vector3( 0.0, 1.0, 0.0 ).applyQuaternion( camRot );
			const camPosRight = camPos.dot( camRight );
			const camPosUp = camPos.dot( camUp );

			// 2. Find how far along its position is along these bases in pixel units
			const camPosRightPx = camPosRight / pixelWidth;
			const camPosUpPx = camPosUp / pixelHeight;

			// 3. Find the fractional pixel units and convert to world units
			const fractX = camPosRightPx - Math.round( camPosRightPx );
			const fractY = camPosUpPx - Math.round( camPosUpPx );

			// 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
			camera.left = - aspectRatio - ( fractX * pixelWidth );
			camera.right = aspectRatio - ( fractX * pixelWidth );
			camera.top = 1.0 - ( fractY * pixelHeight );
			camera.bottom = - 1.0 - ( fractY * pixelHeight );
			camera.updateProjectionMatrix();

		}