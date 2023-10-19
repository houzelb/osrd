use super::OSRDIdentified;

use super::utils::Identifier;
use super::OSRDTyped;
use super::ObjectType;

use crate::infra_cache::Cache;
use crate::infra_cache::ObjectCache;

use derivative::Derivative;

use editoast_derive::InfraModel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

type StaticPortConnection = (&'static str, &'static str);
type StaticMap = (&'static str, &'static [StaticPortConnection]);
type NodeType = &'static str;
type NodePorts = &'static [&'static str];
type NodeGroups = &'static [&'static [StaticMap]];

#[derive(Debug, Derivative, Clone, Deserialize, Serialize, PartialEq, Eq, InfraModel)]
#[serde(deny_unknown_fields)]
#[infra_model(table = "crate::tables::infra_object_extended_switch_type")]
#[derivative(Default)]
pub struct SwitchType {
    pub id: Identifier,
    pub ports: Vec<Identifier>,
    pub groups: HashMap<Identifier, Vec<SwitchPortConnection>>,
}

impl OSRDTyped for SwitchType {
    fn get_type() -> ObjectType {
        ObjectType::SwitchType
    }
}

impl OSRDIdentified for SwitchType {
    fn get_id(&self) -> &String {
        &self.id
    }
}

#[derive(Debug, Derivative, Clone, Deserialize, Serialize, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
#[derivative(Default)]
pub struct SwitchPortConnection {
    pub src: Identifier,
    pub dst: Identifier,
}

impl From<&StaticPortConnection> for SwitchPortConnection {
    fn from(connections: &StaticPortConnection) -> Self {
        Self {
            src: connections.0.into(),
            dst: connections.1.into(),
        }
    }
}

impl Cache for SwitchType {
    fn get_track_referenced_id(&self) -> Vec<&String> {
        vec![]
    }

    fn get_object_cache(&self) -> ObjectCache {
        ObjectCache::SwitchType(self.clone())
    }
}

trait BuiltinType {
    const TYPE: NodeType;
    const PORTS: NodePorts;
    const GROUPS: NodeGroups;
}

pub struct Link;

impl Link {
    pub const A: &'static str = "A";
    pub const B: &'static str = "B";
    pub const STATIC: &'static str = "STATIC";
}

impl BuiltinType for Link {
    const TYPE: NodeType = "link";
    const PORTS: NodePorts = &[Self::A, Self::B];
    const GROUPS: NodeGroups = &[&[(Self::STATIC, &[(Self::A, Self::B)])]];
}

pub struct PointSwitch;

impl PointSwitch {
    pub const A: &'static str = "A";
    pub const B1: &'static str = "B1";
    pub const B2: &'static str = "B2";
    pub const A_B1: &'static str = "A_B1";
    pub const A_B2: &'static str = "A_B2";
}

impl BuiltinType for PointSwitch {
    const TYPE: NodeType = "point_switch";
    const PORTS: NodePorts = &[Self::A, Self::B1, Self::B2];
    const GROUPS: NodeGroups = &[
        &[(Self::A_B1, &[(Self::A, Self::B1)])],
        &[(Self::A_B2, &[(Self::A, Self::B2)])],
    ];
}

pub struct Crossing;

impl Crossing {
    pub const A1: &'static str = "A1";
    pub const A2: &'static str = "A2";
    pub const B1: &'static str = "B1";
    pub const B2: &'static str = "B2";
    pub const STATIC: &'static str = "STATIC";
}

impl BuiltinType for Crossing {
    const TYPE: NodeType = "crossing";
    const PORTS: NodePorts = &[Self::A1, Self::A2, Self::B1, Self::B2];
    const GROUPS: NodeGroups = &[&[(Self::STATIC, &[(Self::A1, Self::B1), (Self::A2, Self::B2)])]];
}

pub struct SingleSlipSwitch;

impl SingleSlipSwitch {
    pub const A1: &'static str = "A1";
    pub const A2: &'static str = "A2";
    pub const B1: &'static str = "B1";
    pub const B2: &'static str = "B2";
    pub const STATIC: &'static str = "STATIC";
    pub const A1_B2: &'static str = "A1_B2";
}

impl BuiltinType for SingleSlipSwitch {
    const TYPE: NodeType = "single_slip_switch";
    const PORTS: NodePorts = &[Self::A1, Self::A2, Self::B1, Self::B2];
    const GROUPS: NodeGroups = &[
        &[(Self::STATIC, &[(Self::A1, Self::B1), (Self::A2, Self::B2)])],
        &[(Self::A1_B2, &[(Self::A1, Self::B2)])],
    ];
}

pub struct DoubleSlipSwitch;

impl DoubleSlipSwitch {
    pub const A1: &'static str = "A1";
    pub const A2: &'static str = "A2";
    pub const B1: &'static str = "B1";
    pub const B2: &'static str = "B2";
    pub const A1_B1: &'static str = "A1_B1";
    pub const A1_B2: &'static str = "A1_B2";
    pub const A2_B1: &'static str = "A2_B1";
    pub const A2_B2: &'static str = "A2_B2";
}

impl BuiltinType for DoubleSlipSwitch {
    const TYPE: NodeType = "double_slip_switch";
    const PORTS: NodePorts = &[Self::A1, Self::A2, Self::B1, Self::B2];
    const GROUPS: NodeGroups = &[
        &[(Self::A1_B1, &[(Self::A1, Self::B1)])],
        &[(Self::A1_B2, &[(Self::A1, Self::B2)])],
        &[(Self::A2_B1, &[(Self::A2, Self::B1)])],
        &[(Self::A2_B2, &[(Self::A2, Self::B2)])],
    ];
}

impl<T: BuiltinType> From<T> for SwitchType {
    fn from(_: T) -> Self {
        let mut groups: HashMap<Identifier, Vec<SwitchPortConnection>> = HashMap::new();
        for group in T::GROUPS {
            let group_name = group[0].0.into();
            let mut vector: Vec<SwitchPortConnection> = vec![];
            for el in group[0].1 {
                vector.append(&mut vec![el.into()])
            }
            groups.insert(group_name, vector);
        }
        let ports = T::PORTS.to_vec().iter().map(|&s| s.into()).collect();

        Self {
            id: T::TYPE.into(),
            ports,
            groups,
        }
    }
}

pub fn builtin_node_types_list() -> Vec<SwitchType> {
    vec![
        Link.into(),
        PointSwitch.into(),
        Crossing.into(),
        SingleSlipSwitch.into(),
        DoubleSlipSwitch.into(),
    ]
}

#[cfg(test)]
mod test {

    use super::SwitchType;
    use crate::models::infra::tests::test_infra_transaction;
    use actix_web::test as actix_test;
    use diesel_async::scoped_futures::ScopedFutureExt;

    #[actix_test]
    async fn test_persist() {
        test_infra_transaction(|conn, infra| {
            async move {
                let data = (0..10)
                    .map(|_| SwitchType::default())
                    .collect::<Vec<SwitchType>>();

                assert!(SwitchType::persist_batch(&data, infra.id.unwrap(), conn)
                    .await
                    .is_ok());
            }
            .scope_boxed()
        })
        .await;
    }
}
