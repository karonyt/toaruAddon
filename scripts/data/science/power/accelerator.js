/**
 * アクセラレータの能力(ベクトル変換)
 * 反射(攻撃の無効化部分)はエンティティjsonで行うものとする
 */

import { world, system, Player, Entity, EntityDamageCause } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import weaponDamage from "../../../lib/database/weaponDamage";
import { Vec3 } from "../../../lib/utils/vec3";

/**
 * 走りのスピードを変更するフォームを表示する
 * @param {Player} player 
 */
export function Speed_change(player) {
    const form = new ModalFormData()
    form.title(`速度変更 / Speed Change`)
    form.slider(`スピード選択(デフォルトは10)`, 1, 500, 1, player.getDynamicProperty(`speed_vector`) ?? 10)
    form.show(player).then(rs => {
        if (rs.canceled) return;
        const value = rs.formValues[0]
        world.sendMessage(`設定完了(${value})`)
        if (value === 10) {
            player.removeTag(`karo:index_speed_change`)
            player.setDynamicProperty(`speed_vector`)
            return;
        } else {
            player.addTag(`karo:index_speed_change`)
            player.setDynamicProperty(`speed_vector`, value)
        }
    })
}

/**
 * 走るスピードを変更する
 */
system.runInterval(() => {
    world.getDimension(`overworld`).getEntities({ tags: [`karo:index_speed_change`] }).forEach(entity => {
        const speed_vector = entity.getDynamicProperty(`speed_vector`)
        if (speed_vector && entity.isSprinting) entity.getComponent("movement").setCurrentValue(speed_vector / 100)
    })
})

/**
 * エンティティをテレポートさせます
 * @param {Player|undefined} source 
 * @param {Entity} entity 
 * @param {Vector3|undefined} location 
 * @param {string|undefined} title 
 */
export function teleport(source, entity, location, title) {
    if (source && !location) {
        const form = new ModalFormData()
        form.title(title)
        form.textField(`X座標`, `数値を入力してください`,)
        form.textField(`Y座標`, `数値を入力してください`)
        form.textField(`Z座標`, `数値を入力してください`)
        form.show(source).then(rs => {
            if (rs.canceled) return
            try {
                const values = rs.formValues
                entity.teleport({ x: Number(values[0]), y: Number(values[1]), z: Number(values[2]) })
            } catch (error) {
                source.sendMessage(`§c入力データが無効です`)
            }
        })
    } else {
        try {
            const values = rs.formValues
            entity.teleport(location)
        } catch (error) {
        }
    }
}

world.afterEvents.entityHitEntity.subscribe((ev) => {
    const { hitEntity, damagingEntity } = ev;
    if (!hitEntity.hasTag(`ippou_tuukou`)) return;
    hitEntity.dimension.playSound(`reflection`, { location: hitEntity.location });
    if(damagingEntity.hasTag(`imagine_breaker`)) return;
    if (damagingEntity instanceof Player) {
        const mainHandId = damagingEntity.getComponent('inventory').container.getItem(damagingEntity.selectedSlot)?.typeId;
        let reflectionDamage = 1;
        if (mainHandId in weaponDamage) {
            reflectionDamage = weaponDamage[mainHandId];
        };
        const { x: rx, z: rz } = hitEntity.getViewDirection();
        damagingEntity.applyKnockback(rx,rz,5,0.2);
        damagingEntity.applyDamage(reflectionDamage,{damagingEntity: hitEntity,cause: EntityDamageCause.entityAttack});
        return;
    }
});