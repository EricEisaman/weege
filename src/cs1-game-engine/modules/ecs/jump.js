export const jump = (()=>{
  

AFRAME.registerComponent('jump', {
  schema: {
    speed: {default: 8},
    g: {default: -9.8},
    jumpsound: {default:''},
    landsound: {default:''},
    jumpingparticles:{default:''},
    landingparticles:{default:''},
    slipstream:{default:''}
  },
  
  init: function(){
    this.el.isJumping = false;
    this.forwardVelocity = -this.data.speed;
    this.verticalVelocity = 0;
    this.jumpEvent = new Event('jump');
    this.landEvent = new Event('land');
    this.jumpDirection = new THREE.Vector3();
    
    
    if(CS1.Scene && CS1.Scene.clock && CS1.Scene.clock.running){
      this.setup();
    }else{
     document.body.addEventListener('game-start',e=>{ this.setup(); });   
    }
    
    
  },
  
  setup: async function(){
    
    const wasdEl = document.querySelector('[wasd-controls]')
    this.wasd =  (wasdEl) ? wasdEl.components['wasd-controls'] : {data: {acceleration:300}}
    
    switch(CS1.device){
      case 'Oculus':
        if(AFRAME.utils.device.checkHeadsetConnected()){
          CS1.MyPlayer.Rh.addEventListener('abuttondown',e=>{
            if(!this.el.isPlaying || CS1.Cam.isSweeping)return;
            this.jump();
          })
        }
        break;
      case 'Mobile':
        document.body.addEventListener("touchstart", e => {
              if(!this.el.isPlaying || CS1.Cam.isSweeping)return;
              let now = new Date().getTime();
              let timesince = now - this.lastJumpTap;

              if (timesince < 300 && 
                  timesince > 0  &&
                  e.changedTouches[0].pageY > window.innerHeight/2) {
                // double tap
                this.jump();
     
              } else {
                // too much time to be a doubletap
              }
              this.lastJumpTap = new Date().getTime();
            });
        break;
        default:
        document.addEventListener('keydown', e=>{
          if(!this.el.isPlaying || CS1.Cam.isSweeping)return;
          if(e.code=='Space' && !this.el.isJumping){
            this.jump();
          }
        });
        break;
    }
    
    
    if(this.data.landingparticles){
      switch(this.data.landingparticles){
        case 'dust':
        this.landingparticles = await CS1.add('cs1-particles',{preset:'dust' , position:'0 -100 0'})
      }
      
    }
    
    if(this.data.jumpsound){
      let s;
      if(this.data.jumpsound.includes('http')){
        s = document.createElement('cs1-sound');
        s.setAttribute('url',this.data.jumpsound);
      }else{
        s = CS1.Media.Sound.Library[this.data.jumpsound].cloneNode()
      }
      this.el.appendChild(s);
      s.addEventListener('loaded',e=>{
        this.jumpsound = s;
      })   
    }
    
    if(this.data.landsound){
      let s;
      if(this.data.landsound.includes('http')){
        s = document.createElement('cs1-sound');
        s.setAttribute('url',this.data.landsound);
      }else{
        s = CS1.Media.Sound.Library[this.data.landsound].cloneNode()
      }
      this.el.appendChild(s);
      s.addEventListener('loaded',e=>{
        this.landsound = s;
      })   
    }
    
    if(this.data.slipstream){
      switch(this.data.slipstream){
        case 'default':
        this.slipstream = await CS1.add('cs1-particles',{preset:'slipstream' , position:'0 -100 0', rotation:'90 0 0'})
        setTimeout(e=>{ 
          this.slipstream.hide() 
          this.slipstream.object3D.position.set(0,0.5,0)
        },1500)
        CS1.MyPlayer.Avatar.appendChild(this.slipstream)
      }
      
    }
    
    
  },
  
  tick: function(t,dt){
    if(this.el.isJumping && !CS1.Cam.isSweeping){
      this.verticalVelocity+=this.data.g*dt/1000;
      this.el.object3D.position.addScaledVector(this.jumpDirection,this.forwardVelocity*dt/1500);
      this.el.object3D.translateY(this.verticalVelocity*dt/1000);
      if(this.verticalVelocity<0 && this.el.object3D.position.y<=0){
        this.land();
      }
    }
  },
  
  jump: function(s){
    this.cachedAcceleration = this.wasd.data.acceleration;
    this.wasd.data.acceleration = 0;
    this.el.isJumping = true;
    CS1.Cam.object3D.getWorldDirection(this.jumpDirection);
    this.jumpDirection.y = (this.jumpDirection.y>=0)?-0.02:this.jumpDirection.y;
    this.jumpDirection.x /= 2;
    this.jumpDirection.z /= 2;
    this.verticalVelocity = s?s:this.data.speed;
    this.el.dispatchEvent(this.jumpEvent);
    if(CS1.MyPlayer.Avatar.Animation.Clips.Jump){
     CS1.MyPlayer.Avatar.Animation.Clips.Jump.duration=Math.max(6500,this.verticalVelocity*1000);
     CS1.MyPlayer.Avatar.Animation.set('Jump')   
    } 
    if(this.slipstream)this.slipstream.show()
    if(this.jumpsound)this.jumpsound.playSound()
  },
  
  land: function(){
    this.el.isJumping = false;
    this.verticalVelocity = 0;
    this.el.object3D.position.y = 0;
    this.wasd.data.acceleration = this.cachedAcceleration;
    this.el.dispatchEvent(this.landEvent); 
    if(CS1.MyPlayer.isWalking && CS1.Input.Keys.down().length)CS1.MyPlayer.Avatar.Animation.set('Run')
    else CS1.MyPlayer.Avatar.Animation.set('Idle')
    if(this.landingparticles){
      this.landingparticles.object3D.position.copy(CS1.MyPlayer.object3D.position)
      this.landingparticles.show()
      setTimeout(e=>{this.landingparticles.hide()},1000)
    }
    if(this.slipstream)this.slipstream.hide()
    if(this.landsound)this.landsound.playSound()
  },
  
  
});
  
})()