import { execute, select } from './databaseService'

export async function getSettings(){const rows=await select<{settingKey:string;settingValue:string}>('SELECT setting_key AS "settingKey",setting_value AS "settingValue" FROM settings');return Object.fromEntries(rows.map(i=>[i.settingKey,i.settingValue]))}
export async function setSetting(key:string,value:string){await execute(`INSERT INTO settings(setting_key,setting_value) VALUES (?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=CURRENT_TIMESTAMP`,[key,value])}
