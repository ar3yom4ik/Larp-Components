/** Physical factory modules. Ports describe material flow and machine attachments,
 * not generator options. Each connected module produces one actual scene item. */
import { registerNode } from './registry';
import { PRODUCTS } from '../../data/products';
import type { NodeDef, ParamDef, PortDef } from './types';

const flowIn: PortDef = { key: 'in', label: 'Material in', type: 'flow', required: true };
const flowOut: PortDef = { key: 'out', label: 'Material out', type: 'flow' };
const conveyorIn: PortDef = { ...flowIn, many: true, help: 'Connect multiple feeders, robots, operators or conveyors here. Inlets are created automatically.' };
const select = (key: string, label: string, value: string, values: string[]): ParamDef => ({key, label, kind: 'select', default: value, options: values.map(v => ({value:v,label:v}))});
const number = (key:string,label:string,value:number,min:number,max:number,step:number): ParamDef => ({key,label,kind:'number',default:value,min,max,step});
const product = (key:string,label:string,value:string): ParamDef => ({key,label,kind:'select',default:value,options: PRODUCTS.map(p=>({value:p.id,label:p.name}))});
const node = (def: Omit<NodeDef,'evaluate'>) => registerNode({...def, evaluate: () => ({})});

node({type:'part.feeder',title:'Feeder',category:'Input',description:'Creates products on the first connected conveyor.',inputs:[],outputs:[flowOut],params:[product('product','Product','billet'),number('interval','Interval (seconds)',5,1,60,0.5)]});
node({type:'part.conveyor',title:'Conveyor',category:'Process',description:'A physical conveyor segment. Connect multiple material sources to its input to merge production lines automatically.',inputs:[conveyorIn],outputs:[flowOut],params:[select('kind','Conveyor type','conveyor',['conveyor','roller']),number('length','Length (metres)',4,2,8,0.5),number('speed','Speed (m/s)',0.6,0.1,3,0.1),{key:'mergeStyle',label:'Merge layout',kind:'select',default:'multi-head',help:'Used when two or more conveyors feed this conveyor.',options:[{value:'multi-head',label:'Multi-head junction'},{value:'side',label:'Side entry to main conveyor'}]}]});
node({type:'part.robot',title:'Robot',category:'Process',description:'Transfers between connected conveyors, tending the connected machine if present.',inputs:[flowIn,{key:'machine',label:'Machine',type:'machine'}],outputs:[flowOut],params:[select('kind','Robot model','robot',['robot','cobot','kuka','fanuc']),select('gripper','Gripper','vacuum',['vacuum','parallel','three-finger','magnetic','soft']),number('speed','Speed (%)',70,1,100,1)]});
node({type:'part.machine',title:'Processing machine',category:'Resources',description:'Attach to a robot. The robot loads and unloads this machine.',inputs:[],outputs:[{key:'machine',label:'Machine',type:'machine'}],params:[select('kind','Machine type','cnc',['cnc','press','weld','packaging','paint','cutter','inspection','assembly','kiln','lathe','grinder']),number('cycleTime','Cycle time (s)',6,1,60,0.5),product('inputProduct','Input product','billet'),product('outputProduct','Output product','machined')]});
node({type:'part.pallet',title:'Pallet',category:'Output',description:'Receives products from a connected robot.',inputs:[flowIn],outputs:[],params:[product('product','Product','machined'),number('cols','Columns',3,1,8,1),number('rows','Rows',2,1,8,1),number('layers','Layers',4,1,10,1)]});

node({type:'part.human',title:'Human operator',category:'Process',description:'Carries parts between a conveyor and another conveyor or pallet. Can tend an attached machine.',inputs:[flowIn,{key:'machine',label:'Machine',type:'machine'}],outputs:[flowOut],params:[number('walkSpeed','Walking speed (m/s)',1,0.3,2,0.1)]});
