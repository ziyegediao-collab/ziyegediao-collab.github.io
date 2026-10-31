// PMP 刷题模拟 · 答题引擎
const GLOSSARY = {
  "Sprint": "一段固定时长（比如两周）的集中开发周期，结束要拿出能用的成果",
  "Sprint目标": "这个周期内团队承诺要达成的核心结果",
  "产品负责人": "负责排需求优先级、替业务拍板“先做什么”的人",
  "产品待办": "按优先级排好的需求清单",
  "站会": "敏捷团队每天简短同步进展、计划和阻碍的会，一般 15 分钟",
  "回顾会": "每个周期结束后，团队复盘流程问题并定改进措施的会",
  "验收标准": "一条需求做到什么样才算完成、能被接受的判断条件",
  "变更控制流程": "所有改动先申请、先评估、先批准再动手的一套规矩",
  "基准": "批准后用来对照的原定范围、进度和成本底线",
  "CPI": "成本绩效指数，花 1 块钱实际干出多少活的比值，低于 1 说明超支",
  "SPI": "进度绩效指数，实际干的活和计划该干的活的比值，低于 1 说明进度落后",
  "风险登记册": "把已识别的风险、影响和应对办法记在一起的清单",
  "收益实现计划": "项目交付后，收益怎么产生、由谁负责跟进的计划",
  "干系人": "项目结果会影响到他、或者他能影响项目的人",
  "干系人参与计划": "针对每个关键干系人，定好沟通方式、频率和参与程度的计划",
  "发起人": "为项目出钱并拍板方向的人",
  "职能经理": "管编制和绩效的直线领导，不是项目经理",
  "仆人式领导": "领导先服务团队、扫清障碍，而不是发号施令",
  "赶工": "加人手、加班来压缩工期，成本会上升",
  "快速跟进": "把原来串行的工作改成并行做，省时间但返工风险变大",
  "ESG": "环境、社会和公司治理三个方面的合规要求",
  "挣值": "用钱来衡量项目干了多少活的方法",
  "用户故事": "从用户角度写的一条小需求",
  "看板": "用列和卡片可视化工作流、限制在制品数量的敏捷方法"
};

let session = null, timerId = null, showWrongOnly = false;

function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function fmt(s){ s=Math.max(0,Math.floor(s)); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function loadStats(){ try{ return JSON.parse(localStorage.getItem("pmpStats")||"{}"); }catch(e){ return {}; } }
function saveStats(s){ localStorage.setItem("pmpStats", JSON.stringify(s)); }

function renderHome(){
  const s = loadStats();
  document.getElementById("bankInfo").textContent =
    "当前题库共 " + BANK.length + " 道（持续扩充中；满 180 道即为完整 4 小时模拟）。";
  document.getElementById("statsText").textContent = s.total
    ? "累计完成 " + s.total + " 套，共答 " + s.answered + " 题，正确率 " + Math.round(100*s.right/s.answered) + "%。"
    : "还没有记录，做完一套这里就有统计。";
  document.getElementById("glossary").innerHTML = Object.entries(GLOSSARY)
    .map(([k,v])=>"<p><b>"+k+"</b>："+v+"</p>").join("");
  show("home");
}
function show(id){ ["home","quiz","result"].forEach(x=>document.getElementById(x).classList.toggle("hidden", x!==id)); }

function startQuiz(mode){
  const pool = shuffle(BANK);
  const qs = mode==="daily" ? pool.slice(0,5) : pool.slice(0,180);
  session = { mode, qs, ans: Array(qs.length).fill(-1), flag: Array(qs.length).fill(false), idx: 0,
              left: qs.length*80, total: qs.length };
  showWrongOnly = false;
  renderQ();
  clearInterval(timerId);
  timerId = setInterval(()=>{
    session.left--;
    const el = document.getElementById("timer");
    el.textContent = fmt(session.left);
    el.classList.toggle("low", session.left < 300);
    if(session.left<=0){ clearInterval(timerId); submitQuiz(true); }
  }, 1000);
  show("quiz");
}
function renderQ(){
  const q = session.qs[session.idx];
  document.getElementById("qPos").textContent = "第 " + (session.idx+1) + " / " + session.total + " 题";
  document.getElementById("qDom").textContent = q.d;
  document.getElementById("timer").textContent = fmt(session.left);
  document.getElementById("prog").style.width = (100*(session.idx+1)/session.total) + "%";
  document.getElementById("qStem").textContent = q.q;
  document.getElementById("opts").innerHTML = q.options.map((o,i)=>
    '<button class="opt'+(session.ans[session.idx]===i?" sel":"")+'" onclick="pick('+i+')">'+
    "ABCD"[i]+". "+o+"</button>").join("");
  document.getElementById("prevBtn").disabled = session.idx===0;
  document.getElementById("nextBtn").textContent = session.idx===session.total-1 ? "最后一题" : "下一题";
  document.getElementById("flagBtn").textContent = session.flag[session.idx] ? "🚩 已标记（点按取消）" : "🚩 标记存疑";
  document.getElementById("grid").innerHTML = session.qs.map((_,i)=>
    '<button class="'+(session.ans[i]>=0?"done ":"")+(session.flag[i]?"flag ":"")+(i===session.idx?"cur":"")+'" onclick="jump('+i+')">'+(i+1)+"</button>").join("");
}
function pick(i){ session.ans[session.idx]=i; renderQ(); }
function jump(i){ session.idx=i; renderQ(); }
function move(d){ session.idx=Math.min(session.total-1, Math.max(0, session.idx+d)); renderQ(); }
function toggleFlag(){ session.flag[session.idx]=!session.flag[session.idx]; renderQ(); }

function submitQuiz(timeout){
  if(!timeout && session.ans.includes(-1)){
    const n = session.ans.filter(a=>a<0).length;
    if(!confirm("还有 " + n + " 道题没做，确定交卷吗？")) return;
  }
  clearInterval(timerId);
  const qs = session.qs, ans = session.ans;
  let right = 0; const doms = {};
  qs.forEach((q,i)=>{
    const ok = ans[i]===q.a; if(ok) right++;
    doms[q.d] = doms[q.d] || {r:0, t:0};
    doms[q.d].t++; if(ok) doms[q.d].r++;
  });
  document.getElementById("scoreTitle").textContent =
    "得分 " + right + " / " + qs.length + "（" + Math.round(100*right/qs.length) + "%）";
  document.getElementById("domBreak").innerHTML = "<h2>分领域正确率</h2>" +
    Object.entries(doms).map(([d,v])=>"<p>"+d+"："+v.r+"/"+v.t+"（"+Math.round(100*v.r/v.t)+"%）</p>").join("");
  renderResList();
  const s = loadStats();
  s.total=(s.total||0)+1; s.answered=(s.answered||0)+qs.length; s.right=(s.right||0)+right;
  saveStats(s);
  show("result");
}
function renderResList(){
  const qs = session.qs, ans = session.ans;
  document.getElementById("resList").innerHTML = qs.map((q,i)=>{
    const ok = ans[i]===q.a;
    if(showWrongOnly && ok) return "";
    return '<div class="res-q"><b>第 '+(i+1)+' 题 · '+q.d+'</b> '+
      '<span class="'+(ok?"ok":"no")+'">'+(ok?"✓ 答对":"✗ 答错")+'</span>'+
      '<p>'+q.q+'</p>'+
      q.options.map((o,j)=>'<p style="margin:2px 0">'+ "ABCD"[j]+". "+o +
        (j===q.a?' <span class="ok">← 正确</span>':'') +
        (j===ans[i] && !ok?' <span class="no">← 你的选择</span>':'') +'</p>').join("")+
      '<p class="why">解析：'+q.why+'</p></div>';
  }).join("") || "<p>全部答对，没有错题。</p>";
}
function filterWrong(btn){
  showWrongOnly = !showWrongOnly;
  btn.textContent = showWrongOnly ? "查看全部" : "只看错题";
  renderResList();
}
function backHome(){ renderHome(); }
function clearStats(){ localStorage.removeItem("pmpStats"); renderHome(); }
renderHome();
