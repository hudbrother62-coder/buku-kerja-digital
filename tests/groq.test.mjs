import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "../api/ai.js";
import health from "../api/health.js";

function response() {
  return {statusCode:200,payload:null,headers:{},
    status(code){this.statusCode=code;return this;},
    json(value){this.payload=value;return this;},
    setHeader(key,value){this.headers[key]=value;}
  };
}
function mockGroq(reply,ids=["llama-3.3-70b-versatile","llama-3.1-8b-instant"]) {
  const previous=globalThis.fetch, calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes("/auth/v1/user"))return new Response(JSON.stringify({id:"user"}),{status:200});
    if(String(url).endsWith("/models"))return new Response(JSON.stringify({data:ids.map(id=>({id,active:true}))}),{status:200});
    if(String(url).endsWith("/chat/completions"))return new Response(JSON.stringify({choices:[{message:{content:reply}}]}),{status:200});
    throw Error("Unexpected request "+url);
  };
  return {calls,restore(){globalThis.fetch=previous;}};
}
const key="gsk_bookspecificmockkey123456789000000";

test("GroqCloud test connection auto-detects model",async()=>{
  const m=mockGroq("OK");
  try {
    const res=response();
    await handler({method:"PUT",headers:{authorization:"Bearer fake-session"},body:{userKey:key}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.payload.provider,"groq");
    assert.equal(res.payload.modelSelection,"automatic");
    assert.equal(res.payload.model,"llama-3.3-70b-versatile");
    assert.equal(m.calls.filter(c=>c.url.endsWith("/models")).length,1);
  }finally{m.restore();}
});

test("GroqCloud chat sends context to auto-selected model",async()=>{
  const m=mockGroq("Jawaban guru siap");
  try{
    const res=response();
    await handler({method:"POST",headers:{authorization:"Bearer fake-session"},body:{prompt:"Ringkas jurnal",userKey:key,context:{profile:{fullName:"Guru"}}}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.payload.reply,"Jawaban guru siap");
    const post=m.calls.find(c=>c.url.endsWith("/chat/completions"));
    const body=JSON.parse(post.options.body);
    assert.equal(body.model,"llama-3.3-70b-versatile");
    assert.equal(post.options.headers.Authorization,"Bearer "+key);
    assert.match(body.messages[1].content,/Ringkas jurnal/);
  }finally{m.restore();}
});

test("Gemini keys cannot be submitted as Groq BYOK",async()=>{
  const m=mockGroq("OK");
  try{
    const res=response();
    await handler({method:"PUT",headers:{authorization:"Bearer session"},body:{userKey:"AIzaNotGroqKeyNotAllowed000000000"}},res);
    assert.equal(res.statusCode,400);
    assert.match(res.payload.error,/GroqCloud/);
  }finally{m.restore();}
});

test("health reveals Groq provider without secrets",()=>{
  const res=response();health({},res);
  assert.equal(res.payload.provider,"groq");
  assert.equal(res.payload.aiModel,"automatic");
  assert.equal("GROQ_API_KEY" in res.payload,false);
});

test("tutorial uses GroqCloud and does not embed obsolete Gemini video",()=>{
  const src=readFileSync(new URL("../src/main.jsx",import.meta.url),"utf8");
  assert.match(src,/console.groq.com\/keys/);
  assert.match(src,/Update AI: kini menggunakan GroqCloud/);
  assert.doesNotMatch(src,/mUTAq9ffk0s/);
});
