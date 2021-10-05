package fr.sncf.osrd.interactive.client_messages;

import com.squareup.moshi.JsonAdapter;
import com.squareup.moshi.Moshi;
import com.squareup.moshi.adapters.PolymorphicJsonAdapterFactory;
import fr.sncf.osrd.interactive.InteractiveSimulation;
import fr.sncf.osrd.interactive.ServerError;
import fr.sncf.osrd.interactive.ServerMessage;
import fr.sncf.osrd.railjson.schema.common.ID;
import fr.sncf.osrd.railjson.schema.infra.railscript.RJSRSExpr;
import fr.sncf.osrd.railjson.schema.infra.signaling.RJSAspectConstraint;
import fr.sncf.osrd.railjson.schema.infra.trackobjects.RJSRouteWaypoint;
import fr.sncf.osrd.railjson.schema.rollingstock.RJSRollingResistance;
import fr.sncf.osrd.railjson.schema.rollingstock.RJSRollingStock;


public abstract class ClientMessage {
    public static final JsonAdapter<ClientMessage> adapter = new Moshi.Builder()
                .add(PolymorphicJsonAdapterFactory.of(ClientMessage.class, "message_type")
                        .withSubtype(InitMessage.class, "init"))
                // for RJSInfra
                .add(ID.Adapter.FACTORY)
                .add(RJSRSExpr.adapter)
                .add(RJSRouteWaypoint.adapter)
                .add(RJSAspectConstraint.adapter)
                // for RJSRollingStock
                .add(RJSRollingResistance.adapter)
                .add(RJSRollingStock.RJSMode.adapter)
                .build()
                .adapter(ClientMessage.class);

    public abstract ServerMessage run(InteractiveSimulation interactiveSimulation) throws ServerError;
}
