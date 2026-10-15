import * as THREE from './vendor/three.module.js';
import {boardLayout} from './board-layout.js';
const FELT = new URL('../assets/mural/felt-purple.png', import.meta.url).href;
const paperColors = {yellow:'#f6df87',pink:'#efa8be',green:'#b8d9aa',blue:'#abd9e5'};

export function createMural3D(host, onSelect) {
    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute('aria-hidden','true');
    renderer.domElement.style.touchAction = 'pan-y';
    host.append(renderer.domElement);
    const scene = new THREE.Scene(), root = new THREE.Group();
    scene.add(root);
    const camera = new THREE.OrthographicCamera(-5.5,5.5,4,-4,.1,100);
    camera.position.set(0,0,25);
    scene.add(new THREE.HemisphereLight(0xfff4df,0x32243c,2.3));
    const key = new THREE.DirectionalLight(0xffebcb,4.5);
    key.position.set(-4,7,10);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-8,right:8,top:14,bottom:-14,near:.1,far:40});
    key.shadow.bias=-.0003; key.shadow.normalBias=.018;key.shadow.radius=3;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd7d4ff,1.5);fill.position.set(7,-3,8);scene.add(fill);
    const loader = new THREE.TextureLoader();
    const felt = loader.load(FELT, invalidate);
    felt.colorSpace=THREE.SRGBColorSpace;felt.wrapS=felt.wrapT=THREE.MirroredRepeatWrapping;
    felt.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const feltMaterial = new THREE.MeshStandardMaterial({map:felt,bumpMap:felt,bumpScale:.055,color:0x9a6c89,roughness:1});
    const gold = new THREE.MeshStandardMaterial({color:0xc49a4b,metalness:.72,roughness:.32});
    const brightGold = new THREE.MeshStandardMaterial({color:0xe5c77f,metalness:.65,roughness:.25});
    const darkGold = new THREE.MeshStandardMaterial({color:0x5e3f25,metalness:.4,roughness:.65});
    const metal = new THREE.MeshStandardMaterial({color:0x393633,metalness:.8,roughness:.25});
    let rows=[],worldH=8,inView=true,contextLost=false,active=true,frame=0,frames=0,hovered=null,disposed=false,generation=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),targets=[],cards=[];
    let tiltX=0,tiltY=0,signature='';
    const ownedTextures = new Set();
    function mesh(geometry,material,parent=root) {
        const object=new THREE.Mesh(geometry,material);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
    }
    function ring(w,h,border,z,material,depth=.08) {
        const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
        const hole=new THREE.Path();hole.moveTo(-w/2+border,-h/2+border);hole.lineTo(-w/2+border,h/2-border);hole.lineTo(w/2-border,h/2-border);hole.lineTo(w/2-border,-h/2+border);hole.closePath();shape.holes.push(hole);
        const obj=mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.025}),material);obj.position.z=z;
    }
    function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines) {
        const words=String(text || '').split(/\s+/);let line='',lines=0;
        for(let i=0;i<words.length;i++) {
            const candidate=line+words[i]+' ';
            if(ctx.measureText(candidate).width>maxWidth && line) {
                ctx.fillText(line.trim()+(lines===maxLines-1?'…':''),x,y);y+=lineHeight;lines++;
                if(lines>=maxLines)return;line=words[i]+' ';
            } else line=candidate;
        }
        if(line && lines<maxLines)ctx.fillText(line.trim(),x,y);
    }
    function textTexture(row) {
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=720;
        const ctx=canvas.getContext('2d');ctx.fillStyle=paperColors[row.color] || paperColors.yellow;ctx.fillRect(0,0,640,720);
        ctx.fillStyle='#21151b';ctx.font='600 62px Caveat, cursive';
        wrapText(ctx,row.text,54,115,530,64,7);
        ctx.font='600 26px sans-serif';wrapText(ctx,row.author,54,645,530,28,2);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=4;ownedTextures.add(texture);return texture;
    }
    function paper(row,w,h,parent) {
        const geometry=new THREE.PlaneGeometry(w,h,14,18),pos=geometry.attributes.position;
        for(let i=0;i<pos.count;i++) {
            const t=(h/2-pos.getY(i))/h,x=pos.getX(i)/w;
            pos.setZ(i,.015+Math.pow(t,3)*(.12+Math.sin(x*5)*.035)+Math.pow(Math.abs(x),3)*.07);
        }
        geometry.computeVertexNormals();
        const material=new THREE.MeshStandardMaterial({map:textTexture(row),roughness:.94,side:THREE.DoubleSide});
        const note=mesh(geometry,material,parent);note.userData.id=row.id;targets.push(note);return note;
    }
    function pin(parent,x,y,size,index) {
        const group=new THREE.Group();group.position.set(x,y,.16);group.rotation.x=.18;group.rotation.y=-.2;parent.add(group);
        const stem=mesh(new THREE.CylinderGeometry(size*.1,size*.1,size*1.8,8),metal,group);stem.rotation.x=Math.PI/2;stem.position.z=.02;
        const color=[0xbe3043,0x2d9d85,0xd6a338,0x4381b4][index%4];
        const material=new THREE.MeshPhysicalMaterial({color,roughness:.26,metalness:.05,clearcoat:1});
        const base=mesh(new THREE.CylinderGeometry(size*.48,size*.7,size*.3,18),material,group);base.rotation.x=Math.PI/2;base.position.z=.12;
        const head=mesh(new THREE.SphereGeometry(size*.65,18,12),material,group);head.scale.z=.6;head.position.z=.22;
    }
    function ornament(x,y,flipX,flipY) {
        const group=new THREE.Group();group.position.set(x,y,.33);group.scale.set(flipX,flipY,1);root.add(group);
        for(let i=0;i<3;i++) {
            const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(.1+i*.08,.12,.1),new THREE.Vector3(.45,.12+i*.08,.04),new THREE.Vector3(.45,.45,.01));
            mesh(new THREE.TubeGeometry(curve,18,.026,6,false),brightGold,group);
        }
        for(let i=0;i<5;i++) {
            const leaf=mesh(new THREE.SphereGeometry(.07,10,8),gold,group);
            leaf.scale.set(.6,1.8,.3);leaf.position.set(.12+i*.065,.1+i*.065,.02);leaf.rotation.z=-.6;
        }
    }
    function clear() {
        root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(![feltMaterial,gold,brightGold,darkGold,metal].includes(o.material))o.material.dispose();}});
        root.clear();ownedTextures.forEach(t=>t.dispose());ownedTextures.clear();targets.length=0;cards.length=0;hovered=null;
    }
    function rebuild() {
        if(disposed)return;const ticket=++generation;clear();
        const W=9.7,H=worldH-.7;
        felt.repeat.set(2.4,2.4*H/W);
        const surface=mesh(new THREE.BoxGeometry(W-.45,H-.45,.16),feltMaterial);surface.position.z=-.1;
        ring(W,H,.26,.01,darkGold,.16);ring(W-.06,H-.06,.12,.16,gold,.16);
        ring(W-.31,H-.31,.065,.12,brightGold,.10);ring(W-.48,H-.48,.045,.025,gold,.08);
        [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sy])=>ornament(sx*(W/2-.27),sy*(H/2-.27),-sx,-sy));
        const innerW=W-1.1,innerH=H-1.1;
        const grid=boardLayout(Math.max(4,rows.length),innerW,innerH);
        const cw=innerW/grid.columns,ch=innerH/grid.rows;
        rows.forEach((row,index)=>{
            const group=new THREE.Group();root.add(group);
            const seed=[-.055,.075,-.035,.045,-.08][index%5];
            const w=Math.min(cw*.82,ch*.73,2.35),h=w*1.12;
            group.position.set(-innerW/2+cw*(index%grid.columns+.5),innerH/2-ch*(Math.floor(index/grid.columns)+.5),.12);
            group.rotation.z=seed;group.userData.base=.12;cards.push(group);
            if(row.image) {
                const pw=Math.min(w*1.2,cw*.9),ph=Math.min(h*1.25,ch*.88);
                const photoBack=mesh(new THREE.BoxGeometry(pw,ph,.025),new THREE.MeshStandardMaterial({color:0xfff8eb,roughness:.85}),group);
                photoBack.rotation.z=-seed*.8;
                loader.load(row.image,texture=>{
                    if(disposed || ticket!==generation){texture.dispose();return;}
                    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;ownedTextures.add(texture);
                    const imageAspect=texture.image.width/texture.image.height,slotAspect=(pw-.14)/(ph-.34);
                    if(imageAspect>slotAspect){texture.repeat.x=slotAspect/imageAspect;texture.offset.x=(1-texture.repeat.x)/2;}else{texture.repeat.y=imageAspect/slotAspect;texture.offset.y=(1-texture.repeat.y)/2;}
                    const photo=mesh(new THREE.PlaneGeometry(pw-.14,ph-.34),new THREE.MeshStandardMaterial({map:texture,roughness:.6}),group);photo.position.set(0,.06,.027);photo.rotation.z=-seed*.8;photo.userData.id=row.id;targets.push(photo);invalidate();
                },undefined,()=>{});
                const note=paper(row,w*.8,h*.64,group);note.position.set(w*.22,-h*.3,.10);note.rotation.z=.10;
                pin(group,0,ph/2-.05,Math.min(.13,w*.07),index);
            } else {paper(row,w,h,group);pin(group,0,h/2-.05,Math.min(.13,w*.07),index);}
            group.userData.id=row.id;
        });
        invalidate();
    }
    function resize() {
        const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
        renderer.setSize(width,height,false);worldH=10.5*height/width;
        camera.left=-5.25;camera.right=5.25;camera.top=worldH/2;camera.bottom=-worldH/2;camera.updateProjectionMatrix();rebuild();
    }
    function render() {
        frame=0;if(!active||disposed)return;
        root.rotation.x+=(tiltX-root.rotation.x)*.16;root.rotation.y+=(tiltY-root.rotation.y)*.16;
        cards.forEach(card=>{const z=card===hovered && !reduced.matches ? .25 : .12;card.position.z+=(z-card.position.z)*.2;});
        renderer.render(scene,camera);
        if(--frames>0)frame=requestAnimationFrame(render);
    }
    function invalidate() {if(disposed)return;frames=reduced.matches?1:24;if(active&&!frame)frame=requestAnimationFrame(render);}
    function hit(event) {
        const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(targets,false)[0]?.object;
    }
    renderer.domElement.addEventListener('pointermove',event=>{
        if(event.pointerType==='touch')return;
        const object=hit(event);hovered=object?cards.find(c=>c.userData.id===object.userData.id):null;
        host.style.cursor=object?'zoom-in':'default';
        if(!reduced.matches){tiltX=pointer.y*.008;tiltY=pointer.x*.012;}invalidate();
    });
    renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;tiltX=tiltY=0;invalidate();});
    let down;
    renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
    renderer.domElement.addEventListener('click',event=>{if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<12){const object=hit(event);if(object)onSelect(object.userData.id);}});
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.closest('.cork-board').classList.remove('has-webgl');contextLost=true;active=false;});
    const observer=new ResizeObserver(resize);observer.observe(host);
    const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;active=inView&&!document.hidden&&!contextLost;if(active)invalidate();});visibility.observe(host);
    const pageVisibility=()=>{active=inView&&!document.hidden&&!contextLost;if(active)invalidate();};document.addEventListener('visibilitychange',pageVisibility);
    return {
        setRows(next){const nextSignature=JSON.stringify(next);if(signature===nextSignature)return;signature=nextSignature;rows=next;rebuild();},
        dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();document.removeEventListener('visibilitychange',pageVisibility);clear();felt.dispose();[feltMaterial,gold,brightGold,darkGold,metal].forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}
    };
}
