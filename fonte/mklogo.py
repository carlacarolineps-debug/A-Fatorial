from PIL import Image
import os
src = Image.open('imgs/img0_b0e05221.png').convert('RGB')
W,H = src.size; p = src.load()
def ss(e0,e1,x):
    t = max(0.0,min(1.0,(x-e0)/(e1-e0))); return t*t*(3-2*t)
A=(0xFF,0xA8,0x3F); B=(0xEC,0x6A,0x00)

def bloco(x0,y0,x1,y1, forcar_laranja=None):
    """recorta com alpha limpo; forcar_laranja = lista de (x,y) locais que devem virar laranja"""
    w,h = x1-x0+1, y1-y0+1
    alpha=[[0]*w for _ in range(h)]; laranja=[[False]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r,g,b = p[x0+x, y0+y]; raw = max(r,g,b)
            a = int(255*ss(20,74,raw)+.5)
            alpha[y][x] = a
            if a:
                f = 255.0/raw
                rr,gg,bb = min(255,int(r*f)),min(255,int(g*f)),min(255,int(b*f))
                mx,mn = max(rr,gg,bb),min(rr,gg,bb)
                laranja[y][x] = ((mx-mn)/mx if mx else 0) > 0.30
    if forcar_laranja:
        for (fx,fy) in forcar_laranja:
            # pinta de laranja a peca conectada que contem esse ponto
            if alpha[fy][fx] < 128: continue
            pilha=[(fx,fy)]; vis=set()
            while pilha:
                cx,cy = pilha.pop()
                if (cx,cy) in vis: continue
                vis.add((cx,cy)); laranja[cy][cx]=True
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny = cx+dx, cy+dy
                    if 0<=nx<w and 0<=ny<h and alpha[ny][nx]>60 and (nx,ny) not in vis:
                        pilha.append((nx,ny))
    out = Image.new('RGBA',(w,h)); o = out.load()
    for y in range(h):
        for x in range(w):
            a = alpha[y][x]
            if not a: o[x,y]=(0,0,0,0); continue
            if laranja[y][x]:
                t = (x/w)*0.42 + (y/h)*0.58
                c = tuple(round(A[i]+(B[i]-A[i])*t) for i in range(3))
            else:
                c = (255,255,255)
            o[x,y] = (c[0],c[1],c[2],a)
    return out

# miolo do "A" de IDEIA: peca solta dentro da letra (na arte embutida vinha branca)
def acha_miolo(x0,y0,x1,y1):
    w,h = x1-x0+1, y1-y0+1
    on = [[max(p[x0+x,y0+y])>90 for x in range(w)] for y in range(h)]
    vis=[[False]*w for _ in range(h)]; pecas=[]
    for y in range(h):
        for x in range(w):
            if on[y][x] and not vis[y][x]:
                pilha=[(x,y)]; cel=[]
                while pilha:
                    cx,cy=pilha.pop()
                    if vis[cy][cx]: continue
                    vis[cy][cx]=True; cel.append((cx,cy))
                    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx,ny=cx+dx,cy+dy
                        if 0<=nx<w and 0<=ny<h and on[ny][nx] and not vis[ny][nx]: pilha.append((nx,ny))
                pecas.append(cel)
    pecas.sort(key=len, reverse=True)
    print('   pecas dentro do A:', [len(c) for c in pecas[:4]])
    return pecas[1][len(pecas[1])//2] if len(pecas)>1 else None

mi = acha_miolo(407,18,536,152)
# converte para coordenada local do bloco IDEIA (que comeca em x=45)
miolo = (mi[0] + (407-45), mi[1]) if mi else None
print('   ponto do miolo (local ao bloco IDEIA):', miolo)

ideia = bloco(45,18,541,152, forcar_laranja=[miolo] if miolo else None)
que   = bloco(200,176,380,230)
vende = bloco(45,252,542,362)

CAP = 200
def esc(img,h): return img.resize((round(img.size[0]*h/img.size[1]), h), Image.LANCZOS)
ideia, vende, que = esc(ideia,CAP), esc(vende,CAP), esc(que, round(CAP*0.33))
regua_h, folga = round(CAP*0.05), round(CAP*0.16)
regua_w = round(que.size[0]*1.06); bloco_w = max(regua_w, que.size[0]); gap = round(CAP*0.24)
TW = ideia.size[0]+gap+bloco_w+gap+vende.size[0]
lock = Image.new('RGBA',(TW,CAP),(0,0,0,0))
lock.paste(ideia,(0,0),ideia)
x = ideia.size[0]+gap
alt = regua_h+folga+que.size[1]+folga+regua_h; top=(CAP-alt)//2
regua = Image.new('RGBA',(regua_w,regua_h)); rp=regua.load()
for xx in range(regua_w):
    t=xx/regua_w*0.6+0.2
    c=tuple(round(A[i]+(B[i]-A[i])*t) for i in range(3))
    for yy in range(regua_h): rp[xx,yy]=(c[0],c[1],c[2],255)
lock.paste(regua,(x+(bloco_w-regua_w)//2, top),regua)
lock.paste(que,(x+(bloco_w-que.size[0])//2, top+regua_h+folga),que)
lock.paste(regua,(x+(bloco_w-regua_w)//2, top+alt-regua_h),regua)
lock.paste(vende,(x+bloco_w+gap,0),vende)
lock = lock.resize((660, round(CAP*660/TW)), Image.LANCZOS)
lock.save('logo_h_660.png', optimize=True)
print('logo horizontal', lock.size, os.path.getsize('logo_h_660.png'),'bytes')
sheet=Image.new('RGB',(700,lock.size[1]*2+70),(8,8,10))
sheet.paste(lock,(20,18),lock)
peq=lock.resize((200,round(lock.size[1]*200/lock.size[0])),Image.LANCZOS)
sheet.paste(peq,(20,lock.size[1]+48),peq)
sheet.save('cmp_horizontal.png')
