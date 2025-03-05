document.addEventListener('DOMContentLoaded', function() {
  // Initialize Three.js scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  
  // Initialize Cannon.js physics world
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0); // Earth gravity
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  
  // Add a ground plane to catch falling objects
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  groundBody.position.set(0, -5, 0);
  world.addBody(groundBody);
  
  // Add invisible walls to keep objects in view
  const wallShape = new CANNON.Plane();
  
  // Left wall
  const leftWallBody = new CANNON.Body({ mass: 0 });
  leftWallBody.addShape(wallShape);
  leftWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  leftWallBody.position.set(-10, 0, 0);
  world.addBody(leftWallBody);
  
  // Right wall
  const rightWallBody = new CANNON.Body({ mass: 0 });
  rightWallBody.addShape(wallShape);
  rightWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
  rightWallBody.position.set(10, 0, 0);
  world.addBody(rightWallBody);
  
  // Back wall
  const backWallBody = new CANNON.Body({ mass: 0 });
  backWallBody.addShape(wallShape);
  backWallBody.position.set(0, 0, -10);
  world.addBody(backWallBody);
  
  // Front wall
  const frontWallBody = new CANNON.Body({ mass: 0 });
  frontWallBody.addShape(wallShape);
  frontWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
  frontWallBody.position.set(0, 0, 10);
  world.addBody(frontWallBody);
  
  // Create a raycaster for mouse interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Store all meshes, bodies, and their original data
  const objects = [];
  const imageElements = document.querySelectorAll('[data-img-id]');
  const textureLoader = new THREE.TextureLoader();
  
  // Preload all textures to avoid flickering
  const textures = [];
  
  // Create fragments for each image
  imageElements.forEach((imageEl, index) => {
    const img = imageEl.querySelector('img');
    const rect = img.getBoundingClientRect();
    const texture = textureLoader.load(img.src);
    textures.push(texture);
    
    // Record original position for later use
    const originalPos = {
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: -(rect.top + rect.height / 2 - window.innerHeight / 2),
      width: rect.width,
      height: rect.height
    };
    
    // Create multiple fragments from each image
    const fragmentCount = 5 + Math.floor(Math.random() * 8); // 5 to 12 fragments
    
    for (let i = 0; i < fragmentCount; i++) {
      // Random size for the fragment
      const width = 0.2 + Math.random() * 0.8;
      const height = 0.2 + Math.random() * 0.8;
      const depth = 0.05 + Math.random() * 0.2;
      
      // Create a mesh with the image texture
      const geometry = new THREE.BoxGeometry(width, height, depth);
      
      // Create a custom UV mapping to show different parts of the texture on each fragment
      const uvOffsetX = Math.random() * 0.5;
      const uvOffsetY = Math.random() * 0.5;
      
      // Apply the UV offset to the geometry
      const uvs = geometry.attributes.uv;
      for (let j = 0; j < uvs.count; j++) {
        let u = uvs.getX(j);
        let v = uvs.getY(j);
        
        u = (u * 0.5) + uvOffsetX;
        v = (v * 0.5) + uvOffsetY;
        
        uvs.setXY(j, u, v);
      }
      
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      
      // Create a physics body
      const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
      const body = new CANNON.Body({ 
        mass: 1,
        linearDamping: 0.3, // Add some damping to make movements more realistic
        angularDamping: 0.3
      });
      body.addShape(shape);
      
      // Position the fragment off-screen initially
      body.position.set(
        originalPos.x / 100 + Math.random() * 2 - 1,
        originalPos.y / 100 + Math.random() * 2 - 1,
        -20 // Behind the camera
      );
      
      // Add some initial rotation
      body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      world.addBody(body);
      
      objects.push({
        mesh,
        body,
        originalPos,
        imageId: imageEl.getAttribute('data-img-id'),
        active: false,
        fragmentIndex: i,
        totalFragments: fragmentCount
      });
    }
    
    // Add hover event to trigger animation
    imageEl.addEventListener('mouseenter', (event) => {
      const imgId = imageEl.getAttribute('data-img-id');
      activateFragments(imgId);
    });
    
    // Optional: Add click event for a more dramatic effect
    imageEl.addEventListener('click', (event) => {
      const imgId = imageEl.getAttribute('data-img-id');
      explodeFragments(imgId);
    });
  });
  
  // Function to activate fragments for a specific image
  function activateFragments(imageId) {
    objects.filter(obj => obj.imageId === imageId).forEach((obj, i) => {
      // Ensure fragments are visible
      obj.mesh.material.opacity = 1;
      obj.active = true;
      
      // Reset position to slightly above the original image position
      obj.body.position.set(
        (obj.originalPos.x / 100) + (Math.random() * 2 - 1),
        (obj.originalPos.y / 100) + 2 + Math.random(),
        Math.random() * 3 - 1.5
      );
      
      // Apply an upward force with some randomness
      obj.body.velocity.set(
        Math.random() * 4 - 2,
        3 + Math.random() * 5,
        Math.random() * 4 - 2
      );
      
      // Apply random rotation
      obj.body.angularVelocity.set(
        Math.random() * 6 - 3,
        Math.random() * 6 - 3,
        Math.random() * 6 - 3
      );
    });
  }
  
  // Function for a more dramatic explosion effect
  function explodeFragments(imageId) {
    objects.filter(obj => obj.imageId === imageId).forEach((obj, i) => {
      // Make visible if not already
      obj.mesh.material.opacity = 1;
      obj.active = true;
      
      // Apply a stronger force in random directions
      const explosionForce = 10 + Math.random() * 15;
      obj.body.velocity.set(
        Math.random() * explosionForce - explosionForce/2,
        Math.random() * explosionForce,
        Math.random() * explosionForce - explosionForce/2
      );
      
      // Apply stronger rotation
      obj.body.angularVelocity.set(
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5
      );
    });
  }
  
  // Mouse movement affects camera and gravity
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  
  document.addEventListener('mousemove', (event) => {
    // Update mouse position for raycaster
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Smooth camera movement
    targetMouseX = mouse.x;
    targetMouseY = mouse.y;
    
    // Tilt gravity based on mouse position (gentler effect)
    world.gravity.set(mouse.x * 3, -9.82 + mouse.y * 2, 0);
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update original positions of all fragments when window is resized
    imageElements.forEach((imageEl) => {
      const img = imageEl.querySelector('img');
      const rect = img.getBoundingClientRect();
      const imgId = imageEl.getAttribute('data-img-id');
      
      const newPos = {
        x: rect.left + rect.width / 2 - window.innerWidth / 2,
        y: -(rect.top + rect.height / 2 - window.innerHeight / 2),
        width: rect.width,
        height: rect.height
      };
      
      // Update original positions for all fragments of this image
      objects.filter(obj => obj.imageId === imgId).forEach(obj => {
        obj.originalPos = newPos;
      });
    });
  });
  
  // Animation loop
  const timeStep = 1 / 60;
  const clock = new THREE.Clock();
  
  function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    // Smooth camera movement
    mouseX += (targetMouseX - mouseX) * 0.1;
    mouseY += (targetMouseY - mouseY) * 0.1;
    
    // Move camera slightly based on mouse position
    camera.position.x = mouseX * 2;
    camera.position.y = mouseY * 2;
    camera.lookAt(scene.position);
    
    // Update physics
    world.step(timeStep);
    
    // Update mesh positions and check if objects are off-screen
    objects.forEach(obj => {
      if (obj.active) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
        
        // Fade out objects that are far from the camera or below the ground
        if (obj.body.position.y < -10 || 
            Math.abs(obj.body.position.x) > 15 || 
            Math.abs(obj.body.position.z) > 15) {
          
          // Fade out the material
          obj.mesh.material.opacity -= 0.05;
          
          // When fully transparent, reset the fragment
          if (obj.mesh.material.opacity <= 0) {
            resetFragment(obj);
          }
        }
      }
    });
    
    renderer.render(scene, camera);
  }
  
  // Function to reset a fragment to its initial state
  function resetFragment(obj) {
    obj.active = false;
    obj.mesh.material.opacity = 0;
    
    // Position it off-screen
    obj.body.position.set(0, 20, -20);
    obj.body.velocity.set(0, 0, 0);
    obj.body.angularVelocity.set(0, 0, 0);
  }
  
  // Start the animation loop
  animate();
});
