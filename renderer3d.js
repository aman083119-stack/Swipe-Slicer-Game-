/* Swipe Slicer — dependency-free WebGL 1 renderer.
 * Real bevelled polygon meshes, per-pixel lighting, procedural environment,
 * adaptive framebuffer sizing, and a graceful Canvas 2D fallback in index.html.
 */
(function (global) {
  'use strict';

  function createSwipeSlicerRenderer(canvas) {
    if (!canvas || !canvas.getContext) return null;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: true, depth: true, stencil: false,
        powerPreference: 'high-performance', premultipliedAlpha: false
      }) || canvas.getContext('experimental-webgl');
    } catch (_) { return null; }
    if (!gl) return null;

    const vertexBackground =
      'attribute vec2 aPosition;\n' +
      'varying vec2 vUv;\n' +
      'void main(){ vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0.0,1.0); }\n';
    const fragmentBackground =
      'precision mediump float;\n' +
      'varying vec2 vUv;\n' +
      'uniform vec2 uResolution;\n' +
      'uniform float uTime;\n' +
      'uniform float uFever;\n' +
      'uniform vec3 uAccent;\n' +
      'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }\n' +
      'void main(){\n' +
      ' vec2 uv=vUv; vec2 p=(uv-.5); p.x*=uResolution.x/max(1.0,uResolution.y);\n' +
      ' vec3 top=vec3(.035,.045,.105); vec3 bottom=vec3(.012,.018,.044);\n' +
      ' vec3 col=mix(bottom,top,smoothstep(0.0,1.0,uv.y));\n' +
      ' float glow=exp(-dot((p-vec2(-.12,.18))*vec2(1.1,.9),(p-vec2(-.12,.18))*vec2(1.1,.9))*2.8);\n' +
      ' col+=uAccent*glow*(.10+uFever*.12);\n' +
      ' float horizon=exp(-abs(uv.y-.28)*18.0);\n' +
      ' col+=vec3(.12,.22,.38)*horizon*.055;\n' +
      ' vec2 gridUv=uv*vec2(34.0,24.0); vec2 gridD=abs(fract(gridUv)-.5);\n' +
      ' float gridLine=1.0-smoothstep(.475,.495,min(gridD.x,gridD.y));\n' +
      ' col+=uAccent*gridLine*(.025+uFever*.025)*(1.0-uv.y*.55);\n' +
      ' vec2 starCell=floor(uv*vec2(155.0,105.0)); float star=step(.9965,hash(starCell));\n' +
      ' float twinkle=.35+.65*sin(uTime*1.7+hash(starCell+4.0)*6.2831);\n' +
      ' col+=vec3(.48,.72,1.0)*star*twinkle*.34;\n' +
      ' float vignette=1.0-smoothstep(.40,.94,length(p*vec2(.85,1.0)));\n' +
      ' col*=.70+.30*vignette;\n' +
      ' gl_FragColor=vec4(col,1.0);\n' +
      '}\n';

    const vertexShape =
      'attribute vec3 aPosition;\n' +
      'attribute vec3 aNormal;\n' +
      'uniform vec2 uViewport;\n' +
      'uniform vec2 uCenter;\n' +
      'uniform float uRadius;\n' +
      'uniform float uDepth;\n' +
      'uniform vec3 uRotation;\n' +
      'varying vec3 vNormal;\n' +
      'varying vec3 vLocal;\n' +
      'varying float vFacing;\n' +
      'vec3 rotate3(vec3 p){\n' +
      ' float cx=cos(uRotation.x),sx=sin(uRotation.x);\n' +
      ' float cy=cos(uRotation.y),sy=sin(uRotation.y);\n' +
      ' float cz=cos(uRotation.z),sz=sin(uRotation.z);\n' +
      ' p.yz=mat2(cx,-sx,sx,cx)*p.yz;\n' +
      ' p.xz=mat2(cy,sy,-sy,cy)*p.xz;\n' +
      ' p.xy=mat2(cz,-sz,sz,cz)*p.xy;\n' +
      ' return p;\n' +
      '}\n' +
      'void main(){\n' +
      ' vec3 p=rotate3(aPosition); vec3 n=normalize(rotate3(aNormal));\n' +
      ' float perspective=900.0/(900.0+uDepth);\n' +
      ' vec2 pixel=uCenter+p.xy*uRadius*perspective;\n' +
      ' vec2 clip=vec2(pixel.x/uViewport.x*2.0-1.0,1.0-pixel.y/uViewport.y*2.0);\n' +
      ' float z=clamp(.46-uDepth*.003-p.z*uRadius*.0012,-.92,.92);\n' +
      ' gl_Position=vec4(clip,z,1.0);\n' +
      ' vNormal=n; vLocal=aPosition; vFacing=max(0.0,n.z);\n' +
      '}\n';
    const fragmentShape =
      'precision mediump float;\n' +
      'uniform vec3 uColor;\n' +
      'uniform float uTime;\n' +
      'uniform float uPrism;\n' +
      'uniform float uBomb;\n' +
      'varying vec3 vNormal;\n' +
      'varying vec3 vLocal;\n' +
      'varying float vFacing;\n' +
      'vec3 hue(float h){\n' +
      ' vec3 c=clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);\n' +
      ' return c*c*(3.0-2.0*c);\n' +
      '}\n' +
      'void main(){\n' +
      ' vec3 N=normalize(vNormal); vec3 L=normalize(vec3(-.42,.66,.92));\n' +
      ' vec3 V=vec3(0.0,0.0,1.0); vec3 H=normalize(L+V);\n' +
      ' float diffuse=max(dot(N,L),0.0);\n' +
      ' float spec=pow(max(dot(N,H),0.0),42.0);\n' +
      ' float rim=pow(1.0-max(dot(N,V),0.0),2.4);\n' +
      ' vec3 base=uColor;\n' +
      ' if(uPrism>.5){ float h=fract(vLocal.x*.26+vLocal.y*.18+uTime*.09+.52); base=hue(h)*.92+.08; }\n' +
      ' if(uBomb>.5) base=vec3(.018,.025,.052);\n' +
      ' float metal=uBomb>.5?.58:.30;\n' +
      ' vec3 lit=base*(.30+diffuse*.84)+vec3(1.0)*spec*(.68+metal*.28);\n' +
      ' lit+=base*rim*(uBomb>.5?.42:.34);\n' +
      ' lit+=vec3(.72,.86,1.0)*pow(max(dot(N,normalize(vec3(.4,.2,1.0))),0.0),95.0)*.34;\n' +
      ' if(uBomb>.5){ float ring=pow(1.0-abs(N.z),3.0); lit+=vec3(1.0,.045,.17)*ring*.62; }\n' +
      ' float edge=smoothstep(.72,.98,abs(vLocal.x)+abs(vLocal.y)*.72);\n' +
      ' lit+=base*edge*.13;\n' +
      ' gl_FragColor=vec4(min(lit,vec3(1.0)),1.0);\n' +
      '}\n';

    function shader(type, source) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(sh) || 'Shader compile failed';
        gl.deleteShader(sh);
        throw new Error(message);
      }
      return sh;
    }
    function program(vs, fs) {
      const p = gl.createProgram();
      const v = shader(gl.VERTEX_SHADER, vs);
      const f = shader(gl.FRAGMENT_SHADER, fs);
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      gl.deleteShader(v); gl.deleteShader(f);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(p) || 'Program link failed';
        gl.deleteProgram(p);
        throw new Error(message);
      }
      return p;
    }

    let bgProgram, shapeProgram;
    try {
      bgProgram = program(vertexBackground, fragmentBackground);
      shapeProgram = program(vertexShape, fragmentShape);
    } catch (error) {
      try { global.console && global.console.warn('Swipe Slicer WebGL shader fallback:', error); } catch (_) {}
      return null;
    }

    const bgPosition = gl.getAttribLocation(bgProgram, 'aPosition');
    const bgResolution = gl.getUniformLocation(bgProgram, 'uResolution');
    const bgTime = gl.getUniformLocation(bgProgram, 'uTime');
    const bgFever = gl.getUniformLocation(bgProgram, 'uFever');
    const bgAccent = gl.getUniformLocation(bgProgram, 'uAccent');
    const aPosition = gl.getAttribLocation(shapeProgram, 'aPosition');
    const aNormal = gl.getAttribLocation(shapeProgram, 'aNormal');
    const uViewport = gl.getUniformLocation(shapeProgram, 'uViewport');
    const uCenter = gl.getUniformLocation(shapeProgram, 'uCenter');
    const uRadius = gl.getUniformLocation(shapeProgram, 'uRadius');
    const uDepth = gl.getUniformLocation(shapeProgram, 'uDepth');
    const uRotation = gl.getUniformLocation(shapeProgram, 'uRotation');
    const uColor = gl.getUniformLocation(shapeProgram, 'uColor');
    const uTime = gl.getUniformLocation(shapeProgram, 'uTime');
    const uPrism = gl.getUniformLocation(shapeProgram, 'uPrism');
    const uBomb = gl.getUniformLocation(shapeProgram, 'uBomb');

    const backgroundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    function triangle(out, a, b, c) {
      const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2];
      const vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
      let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      const len=Math.hypot(nx,ny,nz)||1; nx/=len; ny/=len; nz/=len;
      for (const p of [a,b,c]) out.push(p[0],p[1],p[2],nx,ny,nz);
    }
    function polygonMesh(sides, radius, halfDepth, star) {
      const out=[], outer=[], inner=[];
      const count=star?sides*2:sides;
      for(let i=0;i<count;i++){
        const angle=-Math.PI/2+i*Math.PI*2/count;
        const rr=radius*(star?(i%2?.47:1):1);
        const x=Math.cos(angle)*rr, y=Math.sin(angle)*rr;
        outer.push([x,y,halfDepth*.48]);
        inner.push([x*.76,y*.76,halfDepth]);
      }
      const centerFront=[0,0,halfDepth], centerBack=[0,0,-halfDepth];
      for(let i=0;i<count;i++){
        const j=(i+1)%count;
        triangle(out,centerFront,inner[i],inner[j]);
        triangle(out,inner[i],outer[i],outer[j]);
        triangle(out,inner[i],outer[j],inner[j]);
        const backInner=[inner[i][0],inner[i][1],-halfDepth];
        const backInnerNext=[inner[j][0],inner[j][1],-halfDepth];
        const backOuter=[outer[i][0],outer[i][1],-halfDepth*.48];
        const backOuterNext=[outer[j][0],outer[j][1],-halfDepth*.48];
        triangle(out,backOuter,backOuterNext,backInnerNext);
        triangle(out,backOuter,backInnerNext,backInner);
        triangle(out,centerBack,backInnerNext,backInner);
        const outerBack=[outer[i][0],outer[i][1],-halfDepth*.48];
        const outerBackNext=[outer[j][0],outer[j][1],-halfDepth*.48];
        triangle(out,outer[i],outerBack,outerBackNext);
        triangle(out,outer[i],outerBackNext,outer[j]);
      }
      return new Float32Array(out);
    }
    function sphereMesh(rows, cols) {
      const out=[];
      for(let y=0;y<rows;y++){
        const v0=y/rows, v1=(y+1)/rows;
        for(let x=0;x<cols;x++){
          const u0=x/cols, u1=(x+1)/cols;
          const point=(u,v)=>{
            const theta=v*Math.PI, phi=u*Math.PI*2;
            const nx=Math.sin(theta)*Math.cos(phi), ny=Math.cos(theta), nz=Math.sin(theta)*Math.sin(phi);
            return [nx*.5,ny*.5,nz*.5,nx,ny,nz];
          };
          const a=point(u0,v0), b=point(u1,v0), c=point(u0,v1), d=point(u1,v1);
          for(const vert of [a,c,b,b,c,d]) out.push(...vert);
        }
      }
      return new Float32Array(out);
    }
    function makeBuffer(data) {
      const buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      return {buffer,count:data.length/6};
    }

    const meshes={
      circle:makeBuffer(polygonMesh(36,1,.25,false)),
      square:makeBuffer(polygonMesh(4,1,.26,false)),
      triangle:makeBuffer(polygonMesh(3,1,.28,false)),
      diamond:makeBuffer(polygonMesh(4,1,.28,false).map((v,i)=>i%6===0?v: v)),
      hex:makeBuffer(polygonMesh(6,1,.25,false)),
      star:makeBuffer(polygonMesh(5,1,.26,true)),
      prism:makeBuffer(polygonMesh(6,1,.34,false)),
      bomb:makeBuffer(sphereMesh(14,22))
    };

    function colorVector(value) {
      const raw=String(value||'#65e6f5').replace('#','');
      const hex=raw.length===3?raw.split('').map(c=>c+c).join(''):raw;
      const n=parseInt(hex.slice(0,6),16);
      if(!Number.isFinite(n)) return [0.35,.8,.95];
      return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
    }

    let width=1, height=1, renderScale=1;
    const startTime=(global.performance&&global.performance.now)?global.performance.now():Date.now();
    function resize(w,h,dpr) {
      if (!(w>0) || !(h>0)) return;
      width=w; height=h;
      const maxBuffer=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||4096;
      const pixelBudget=12000000;
      const pixelScale=Math.sqrt(pixelBudget/(w*h));
      renderScale=Math.max(.5,Math.min(dpr||1,2,pixelScale,maxBuffer/w,maxBuffer/h));
      canvas.width=Math.max(1,Math.floor(w*renderScale));
      canvas.height=Math.max(1,Math.floor(h*renderScale));
      gl.viewport(0,0,canvas.width,canvas.height);
    }

    function render(shapes, options) {
      if (gl.isContextLost && gl.isContextLost()) return;
      const now=((global.performance&&global.performance.now)?global.performance.now():Date.now())-startTime;
      const seconds=now*.001, opts=options||{};
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.clearColor(.012,.018,.045,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(bgProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER,backgroundBuffer);
      gl.enableVertexAttribArray(bgPosition);
      gl.vertexAttribPointer(bgPosition,2,gl.FLOAT,false,0,0);
      gl.uniform2f(bgResolution,canvas.width,canvas.height);
      gl.uniform1f(bgTime,seconds);
      gl.uniform1f(bgFever,opts.fever?1:0);
      gl.uniform3fv(bgAccent,colorVector(opts.accent));
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.useProgram(shapeProgram);
      gl.uniform2f(uViewport,width,height);
      gl.uniform1f(uTime,seconds);
      const shake=opts.shake&&!opts.reducedMotion?opts.shake:0;
      for(const shape of shapes||[]) {
        if(shape.sliced) continue;
        const pulse=1+Math.sin(seconds*2.4+(shape.r||20)*.13)*.012;
        const r=(shape.r||24)*pulse;
        const dx=shake?(Math.sin(seconds*70+(shape.x||0))-.5)*shake*.65:0;
        const dy=shake?(Math.cos(seconds*81+(shape.y||0))-.5)*shake*.65:0;
        const depth=Number(shape.depth)||0;
        const tiltX=(shape.tiltX||0)+Math.sin(seconds*1.25+(shape.x||0)*.01)*.12;
        const tiltY=(shape.tiltY||0)+Math.cos(seconds*1.15+(shape.y||0)*.01)*.15;
        const rotation=shape.rotation||0;
        const type=shape.bomb?'bomb':(meshes[shape.type]?shape.type:'circle');
        const mesh=meshes[type];
        const color=shape.bomb?[.045,.055,.09]:colorVector(shape.color);
        gl.uniform2f(uCenter,(shape.x||0)+dx,height-(shape.y||0)+dy);
        gl.uniform1f(uRadius,r);
        gl.uniform1f(uDepth,depth);
        gl.uniform3f(uRotation,tiltX,tiltY,rotation);
        gl.uniform3fv(uColor,color);
        gl.uniform1f(uPrism,shape.wildcard?1:0);
        gl.uniform1f(uBomb,shape.bomb?1:0);
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
        gl.enableVertexAttribArray(aPosition);
        gl.enableVertexAttribArray(aNormal);
        gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,24,0);
        gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,24,12);
        gl.drawArrays(gl.TRIANGLES,0,mesh.count);
      }
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearDepth(1);
    return {
      resize:resize,
      render:render,
      getContext:function(){return gl;},
      getRenderScale:function(){return renderScale;}
    };
  }

  global.createSwipeSlicerRenderer=createSwipeSlicerRenderer;
})(window);
